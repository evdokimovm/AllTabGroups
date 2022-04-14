var files = []

var possible_colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

function fillSelectBox() {
    var selectElement = document.querySelector('#select_color')
    selectElement.querySelectorAll('option').forEach(option => option.remove())
    selectElement.add(new Option('All Tabs'))

    for (var color of possible_colors) {
        chrome.tabGroups.query({ color: color }, function (group) {
            if (!group.length) return

            selectElement.add(new Option(group[0].color))
        })
    }
}

chrome.tabGroups.onUpdated.addListener(fillSelectBox)
chrome.tabGroups.onCreated.addListener(fillSelectBox)
chrome.tabGroups.onRemoved.addListener(fillSelectBox)
chrome.tabGroups.onMoved.addListener(fillSelectBox)

function setHeight() {
    document.querySelector('.list').setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
    document.querySelector('textarea').setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
}

function linkPreview() {
    var line_1 = ''
    var line_2 = ''
    var links = ''
    var link_text = $('textarea').val()
    var lines = link_text.split('\n')
    for (var i = 0; i < lines.length; i++) {
        line_1 = line_2
        line_2 = lines[i]
        if (is.url(line_2) && !is.url(line_1)) {

            links += "<li><a href='" + line_2 + "' target='_blank'><h5>" + line_1 + "</h5><span>" + line_2.replace(/^https?\:\/\//i, "") + "</span></a></li>"

            line_1 = ''
            line_2 = ''
        }
    }
    $('.links').html(links)
}

function showFiles() {
    var file_list = $('.files')
    file_list.html('')
    chrome.storage.local.get('files', function (value) {
        files = value['files']
        $.each(value.files, function (i, file) {
            var li_element = ""
            if (file) {
                li_element += "<li class='public_icon'>"

                li_element += "<a href='#' data-id='" + file.id + "' class='file'>"
                li_element += "<h5>" + file.name + "</h5><span>" + file.time + "</span></a>"
                li_element += "</li>"

                file_list.prepend(li_element)
            }
        })
    })
}

function deleteFile(id) {
    $.each(files, function (i, v) {
        if (v.id == id) {
            files.splice(i, 1)
            chrome.storage.local.set({ 'files': files }, function () {
                window.location.reload()
            })
        }
    })
}

function addFile(new_file) {
    chrome.storage.local.get('files', function (value) {
        if (typeof value["files"] !== "undefined" && value["files"] !== "") {
            var files = value["files"]
            files.push(new_file)
        }
        else {
            var files = [];
            files.push(new_file)
        }
        chrome.storage.local.set({ 'files': files }, function () {
            showFiles()
        })
    })
}

function clearAll() {
    chrome.storage.local.set({ 'files': [] }, function () {
        showFiles()
    })
}

function generateURLTitlePairs(tabs) {
    var urls = ""
    for (var tab of tabs) {
        if (tab.url.indexOf('chrome') !== 0) {
            urls += tab.title + "\n" + tab.url + "\n\n"
        }
    }
    return urls
}

function readTabs() {
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
        $('textarea').val(generateURLTitlePairs(tabs))
        linkPreview()
        setHeight()
    })
}

function getTabsFromCertainGroup(tab_type) {
    if (possible_colors.includes(tab_type)) {
        chrome.tabGroups.query({ color: tab_type }, function (groups) {
            chrome.tabs.query({ groupId: groups[0].id }, function (tabs) {
                $('textarea').val(generateURLTitlePairs(tabs))
                linkPreview()
            })
        })
    } else {
        readTabs()
    }
}

$('#select_color').change(function ($e) {
    getTabsFromCertainGroup($(this).val())
})

readTabs()
fillSelectBox()
showFiles()
new Clipboard('.copy')
$('input[name=filename]').val(moment().format('DD MMM YYYY, h:mm a'))

document.querySelector('button.opentabs').addEventListener('click', function () {
    var lines = $('textarea').val().split('\n')
    for (var i = 0; i < lines.length; i++) {
        if (is.url(lines[i])) {
            chrome.tabs.create({ url: lines[i] })
        }
    }
})

var props = {
    multiple: false,
    types: [
        {
            description: 'import only from',
            accept: {
                'application/json': '.json'
            }
        }
    ],
    excludeAcceptAllOption: true
}

document.querySelector('button.export_file').addEventListener('click', function () {
    var _id = $(this).attr('data-id')
    var _filename = document.querySelector('input[name=filename]')
    var url = ''

    chrome.storage.local.get('files', (_storage) => {
        for (var file of _storage.files) {
            if (file.id == _id) {
                url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(file))))

                chrome.downloads.download({
                    url: url,
                    filename: (_filename.value.replace(':', ' ')) + '.json'
                })
            }
        }
    })
})

document.querySelector('button.import_file').addEventListener('click', async function () {
    var handles = await showOpenFilePicker(props)
    var file = await handles[0].getFile()

    var import_contents = await file.text()
    var json_cnt = await JSON.parse(import_contents)

    addFile(json_cnt)

    window.location.reload()
})

document.querySelector('button.export_all_files').addEventListener('click', function () {
    chrome.storage.local.get('files', function (items) {
        var result = JSON.stringify(items)

        var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(result)))
        chrome.downloads.download({
            url: url,
            filename: 'alltabs.json'
        })
    })
})

document.querySelector('button.import_all_files').addEventListener('click', async function () {
    var handles = await showOpenFilePicker(props)
    var file = await handles[0].getFile()

    var import_contents = await file.text()
    var jsoned = JSON.parse(import_contents)

    chrome.storage.local.set({ 'files': jsoned.files }, function () {
        window.location.reload()
    })
})

$('.save').on('click', function () {
    var file_obj = {}
    file_obj.id = moment().format('x')
    file_obj.time = moment().format('DD MMM YYYY, h:mm a')
    file_obj.links = $('textarea').val()

    if ($('input[name=filename]').val() == "") {
        file_obj.name = file_obj.time
    } else {
        file_obj.name = $('input[name=filename]').val()
    }
    addFile(file_obj)
    return false
})

$(document).on('click', '.file', function () {
    var id = $(this).attr('data-id')
    $.each(files, function (i, v) {
        if (v.id == id) {
            $('textarea').val(v.links)
            $('input[name=filename]').val(v.name)
            $('.links').html('')
            linkPreview()
            $('.export_file').attr('data-id', id)
            $('.export_file').prop('disabled', false)
            $('.delete_file').show()
            $('.delete_file').attr('data-id', id)
        }
    })
})

$('.delete_files').on('click', function () {
    if (confirm('Sure?')) {
        clearAll()
    }
})

$('textarea').on('keyup', function () {
    linkPreview()
})

$(document).on('click', '.delete_file', function () {
    if (confirm('Sure?')) {
        deleteFile($(this).attr('data-id'))
        return false;
    }
})
