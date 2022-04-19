var files = []

var possible_colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

function getTabsFromCertainGroup(tab_type) {
    if (tab_type == "All Tabs") {
        readTabs()
    } else {
        getEitherByColorOrTitle(tab_type)
    }
}

function getBy(option) {
    chrome.tabGroups.query(option, function (groups) {
        chrome.tabs.query({ groupId: groups[0].id }, function (tabs) {
            $('textarea').val(generateURLTitlePairs(tabs))
            linkPreview()
        })
    })
}

function getEitherByColorOrTitle(label) {
    if (possible_colors.includes(label)) {
        getBy({ color: label })
    } else {
        getBy({ title: label })
    }
}

function fillSelectBox() {
    var selectElement = document.querySelector('#select_color')
    selectElement.querySelectorAll('option').forEach(option => option.remove())
    selectElement.add(new Option('All Tabs'))

    chrome.windows.getCurrent(function (win) {
        chrome.tabGroups.query({ windowId: win.id }, function (groups) {
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].title) {
                    selectElement.add(new Option(groups[i].title))
                } else {
                    selectElement.add(new Option(groups[i].color))
                }
            }
        })
    })

    getTabsFromCertainGroup("All Tabs")
}

chrome.tabGroups.onUpdated.addListener(fillSelectBox)
chrome.tabGroups.onCreated.addListener(fillSelectBox)
chrome.tabGroups.onRemoved.addListener(fillSelectBox)
chrome.tabGroups.onMoved.addListener(fillSelectBox)

function setHeight() {
    document.querySelector('.list').setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
    document.querySelector('textarea').setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
}

function copy() {
    var copyText = document.querySelector("textarea")
    copyText.select()
    document.execCommand("copy")
}

function getDate() {
    var date = new Date()
    var options = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }
    var _date = date.toLocaleTimeString('default', options)

    return _date
}

function arrayFromTextarea() {
    var link_text = document.querySelector('textarea').value
    var lines = link_text.split('\n').filter(Boolean)

    return lines
}

function linkPreview() {
    var links = ''
    var lines = arrayFromTextarea()
    for (var i = 0; i < lines.length; i += 2) {
        links += "<li><a href='" + lines[i + 1] + "' target='_blank'><h5>" + lines[i] + "</h5><span>" + lines[i + 1].replace(/^https?\:\/\//i, "") + "</span></a></li>"
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

$('#select_color').change(function ($e) {
    getTabsFromCertainGroup($(this).val())
})

readTabs()
fillSelectBox()
showFiles()
document.querySelector(".copy").addEventListener("click", copy)
$('input[name=filename]').val(getDate())

document.querySelector('button.opentabs').addEventListener('click', function () {
    var lines = arrayFromTextarea()
    for (var i = 0; i < lines.length; i += 2) {
        chrome.tabs.create({ url: lines[i + 1] })
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

async function pickFile(props) {
    var handles = await showOpenFilePicker(props)
    var file = await handles[0].getFile()

    var import_contents = await file.text()
    var json_cnt = await JSON.parse(import_contents)

    return json_cnt
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
                    filename: (_filename.value.replaceAll(':', ' ')) + '.json'
                })
            }
        }
    })
})

document.querySelector('button.import_file').addEventListener('click', async function () {
    var json_cnt = await pickFile(props)

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
    var json_cnt = await pickFile(props)

    chrome.storage.local.set({ 'files': json_cnt.files }, function () {
        window.location.reload()
    })
})

$('.save').on('click', function () {
    var file_obj = {}
    file_obj.id = String(+ new Date())
    file_obj.time = getDate()
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
