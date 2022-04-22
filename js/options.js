var list = document.querySelector('.list')
var file_list = document.querySelector('.files')
var links_list = document.querySelector('.links')
var selectElement = document.querySelector('#select_color')

var textarea = document.querySelector('textarea')
var filename_input = document.querySelector('input[name=filename]')

var copy_button = document.querySelector('.copy')
var save_button = document.querySelector('.save')
var opentabs_button = document.querySelector('button.opentabs')
var export_file_button = document.querySelector('.export_file')
var delete_file_button = document.querySelector('.delete_file')
var delete_files_button = document.querySelector('.delete_files')
var import_file_button = document.querySelector('button.import_file')
var import_all_files_button = document.querySelector('button.import_all_files')
var export_all_files_button = document.querySelector('button.export_all_files')

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
            textarea.value = generateURLTitlePairs(tabs)
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
    selectElement.options.length = 0
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
    list.setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
    textarea.setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
}

function copy() {
    textarea.select()
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
    var link_text = textarea.value
    var lines = link_text.split('\n').filter(Boolean)

    return lines
}

function linkPreview() {
    var links = ''
    var lines = arrayFromTextarea()
    for (var i = 0; i < lines.length; i += 2) {
        links += "<li><a href='" + lines[i + 1] + "' target='_blank'><h5>" + lines[i] + "</h5><span>" + lines[i + 1].replace(/^https?\:\/\//i, "") + "</span></a></li>"
    }
    links_list.innerHTML = links
}

function deleteFolderActiveClass() {
    var active_folder = document.querySelector('a.active')

    if (active_folder) {
        active_folder.classList.remove('active')
    }
}

function addActiveClassOnOpenedFolder(e) {
    deleteFolderActiveClass()

    if (e.target.tagName == 'A') {
        e.target.classList.add('active')
    } else {
        e.target.parentNode.classList.add('active')
    }
}

function readFile(e) {
    var id = e.target.dataset.id || e.target.parentNode.dataset.id

    addActiveClassOnOpenedFolder(e)

    chrome.storage.local.get('files', function (files) {
        var files = files.files
        for (var i = 0; i < files.length; i++) {
            if (files[i].id == id) {
                textarea.value = files[i].links
                filename_input.value = files[i].name
                linkPreview()
                export_file_button.dataset.id = id
                export_file_button.disabled = false
                delete_file_button.style.display = 'inline-block'
                delete_file_button.dataset.id = id
            }
        }
    })
}

function showFiles() {
    file_list.innerHTML = ''
    chrome.storage.local.get('files', function (files) {
        var files = files.files
        for (var i = 0; i < files.length; i++) {
            var li_element = document.createElement('li')

            var a_element = document.createElement('a')
            a_element.href = '#'
            a_element.dataset.id = files[i].id
            a_element.className = 'file'
            a_element.innerHTML = "<h5>" + files[i].name + "</h5><span>" + files[i].time + "</span>"

            a_element.addEventListener('click', readFile)

            li_element.appendChild(a_element)
            file_list.insertBefore(li_element, file_list.firstChild)
        }
    })
}

function deleteFile(id) {
    chrome.storage.local.get('files', function (files) {
        var files = files.files
        for (var i = 0; i < files.length; i++) {
            if (files[i].id == id) {
                files.splice(i, 1)
                chrome.storage.local.set({ 'files': files }, function () {
                    window.location.reload()
                })
            }
        }
    })
}

function addFile(new_file) {
    chrome.storage.local.get('files', function (data) {
        if (data.files) {
            var files = data.files
            files.push(new_file)
        } else {
            var files = []
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
        textarea.value = generateURLTitlePairs(tabs)
        linkPreview()
        setHeight()
    })
}

selectElement.addEventListener('change', function(e) {
    getTabsFromCertainGroup(e.target.value)
})

readTabs()
fillSelectBox()
showFiles()
copy_button.addEventListener("click", copy)
filename_input.value = getDate()

opentabs_button.addEventListener('click', function () {
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

export_file_button.addEventListener('click', function (e) {
    var _id = e.target.dataset.id
    var _filename = filename_input.value
    var url = ''

    chrome.storage.local.get('files', (_storage) => {
        for (var file of _storage.files) {
            if (file.id == _id) {
                url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(file))))

                chrome.downloads.download({
                    url: url,
                    filename: (_filename.replaceAll(':', ' ')) + '.json'
                })
            }
        }
    })
})

import_file_button.addEventListener('click', async function () {
    var json_cnt = await pickFile(props)

    addFile(json_cnt)

    window.location.reload()
})

export_all_files_button.addEventListener('click', function () {
    chrome.storage.local.get('files', function (items) {
        var result = JSON.stringify(items)

        var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(result)))
        chrome.downloads.download({
            url: url,
            filename: 'alltabs.json'
        })
    })
})

import_all_files_button.addEventListener('click', async function () {
    var json_cnt = await pickFile(props)

    chrome.storage.local.set({ 'files': json_cnt.files }, function () {
        window.location.reload()
    })
})

save_button.addEventListener('click', function() {
    var file_obj = {}
    file_obj.id = String(+ new Date())
    file_obj.time = getDate()
    file_obj.links = textarea.value

    if (!filename_input.value) {
        file_obj.name = file_obj.time
    } else {
        file_obj.name = filename_input.value
    }
    addFile(file_obj)
    return false
})

delete_files_button.addEventListener('click', function() {
    if (confirm('Sure?')) {
        clearAll()
    }
})

delete_file_button.addEventListener('click', function(e) {
    if (confirm('Sure?')) {
        deleteFile(e.target.dataset.id)
        return false
    }
})
