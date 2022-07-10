var list = document.querySelectorAll('.list')
var file_list = document.querySelector('.files')
var links_list = document.querySelector('.links')
var select_group = document.querySelector('#select_group')

var textarea = document.querySelector('textarea')
var settings = document.querySelectorAll('input.settings')
var filename_input = document.querySelector('input[name=filename]')
var all_windows_checkbox = document.querySelector('input.all_windows')
var ignore_pinned_checkbox = document.querySelector('input.ignore_pinned')

var copy_button = document.querySelector('.copy')
var save_button = document.querySelector('.save')
var rename_file_button = document.querySelector('.rename')
var opentabs_button = document.querySelector('button.opentabs')
var merge_files_button = document.querySelector('.merge_files')
var export_file_button = document.querySelector('.export_file')
var delete_file_button = document.querySelector('.delete_file')
var delete_files_button = document.querySelector('.delete_files')
var import_file_button = document.querySelector('button.import_file')
var import_all_files_button = document.querySelector('button.import_all_files')
var export_all_files_button = document.querySelector('button.export_all_files')

var file_ids = []
var separator = ' - '
var query_options = { currentWindow: true }
var default_settings = { all_instances: false, ignore_pinned: false }
var possible_colors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange']

function getTabsFromCertainGroup(tab_type) {
    if (tab_type == "All Tabs") {
        delete query_options.groupId
        readTabs()
    } else if (tab_type == "Not Grouped") {
        query_options.groupId = -1
        readTabs()
    } else {
        getEitherByColorOrTitle(tab_type)
    }
}

function getBy(option) {
    chrome.tabGroups.query(option, function (groups) {
        chrome.tabs.query({ groupId: groups[0].id }, function (tabs) {
            textarea.value = generateURLTitlePairs(tabs)
            filename_input.value = getDate()
            linkPreview()
        })
    })
}

function splitLabel(label) {
    var color = ''
    var title = ''

    if (label.includes(separator)) {
        color = label.substring(0, label.indexOf(separator))
        title = label.substring(label.indexOf(separator) + separator.length)
    } else {
        color = label
        title = ''
    }

    return {
        color: color,
        title: title
    }
}

function getEitherByColorOrTitle(label) {
    var { color, title } = splitLabel(label)

    if (possible_colors.includes(color) && title) {
        getBy({ color: color, title: title })
    } else {
        getBy({ color: color, title: title })
    }
}

async function getWindows(flag) {
    var windows = []

    if (flag) {
        windows = await chrome.windows.getAll()
    } else {
        windows.push(await chrome.windows.getCurrent())
    }

    return windows
}

async function fillSelectBox(flag) {
    var windows = await getWindows(flag)

    select_group.options.length = 0
    select_group.add(new Option('All Tabs'))
    select_group.add(new Option('Not Grouped'))

    for (var i = 0; i < windows.length; i++) {
        chrome.tabGroups.query({ windowId: windows[i].id }, function (groups) {
            for (var i = 0; i < groups.length; i++) {
                if (groups[i].title) {
                    select_group.add(new Option(`${groups[i].color}${separator}${groups[i].title}`))
                } else {
                    select_group.add(new Option(`${groups[i].color}`))
                }
            }
        })
    }

    getTabsFromCertainGroup("All Tabs")
}

chrome.tabGroups.onUpdated.addListener(fillSelectBox)
chrome.tabGroups.onCreated.addListener(fillSelectBox)
chrome.tabGroups.onRemoved.addListener(fillSelectBox)
chrome.tabGroups.onMoved.addListener(fillSelectBox)

function setHeight() {
    list[0].setAttribute("style", `height: ${window.innerHeight / 1.5}px`)
    list[1].setAttribute("style", `height: ${window.innerHeight / 1.6}px`)
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

function replaceTags(title) {
    var test_if_tag = new RegExp('<.*?.|<.*?>|<\/.*?>')
    if (test_if_tag.test(title)) {
        title = title.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    }
    return title
}

function linkPreview() {
    var links = ''
    var lines = arrayFromTextarea()
    for (var i = 0; i < lines.length; i += 2) {
        links += "<li><a href='" + lines[i + 1] + "' target='_blank'><h5>" + replaceTags(lines[i]) + "</h5><span>" + lines[i + 1] + "</span></a></li>"
    }
    links_list.innerHTML = links
}

function deleteFolderActiveClass(n_times) {
    for (var i = 0; i <= n_times; i++) {
        var active_folder = document.querySelector('a.active')

        if (active_folder) {
            active_folder.classList.remove('active')
        }
    }

    file_ids.length = 0
}

function toggleActiveness(e) {
    var folder = e.target.tagName == 'A' ? e.target : e.target.parentNode
    var folder_id = folder.dataset.id

    if (!e.ctrlKey) {
        deleteFolderActiveClass(file_ids.length)
        file_ids.push(folder_id)
    }

    if (e.ctrlKey && folder.classList.contains('active')) {
        folder.classList.remove('active')
        file_ids = file_ids.filter(id => id != folder_id)
    } else {
        folder.classList.add('active')
    }

    if (!file_ids.length) {
        switchButtonsActiveness(false)
        readTabs()
    }
}

async function showFiles() {
    file_list.innerHTML = ''

    var files = await promiseWrapper('files', storageGetAllFrom)
    if (!files) return false

    for (var i = 0; i < files.length; i++) {
        var li_element = document.createElement('li')

        var a_element = document.createElement('a')
        a_element.href = '#'
        a_element.dataset.id = files[i].id
        a_element.className = 'file'
        a_element.innerHTML = "<h5>" + files[i].name + "</h5><span>" + files[i].time + "</span>"

        a_element.addEventListener('click', (e) => findByIdThenPerform(e, readFile))

        li_element.appendChild(a_element)
        file_list.insertBefore(li_element, file_list.firstChild)
    }
}

async function promiseWrapper(options, callback) {
    return new Promise((resolve, reject) => {
        try {
            callback(options, resolve)
        } catch (err) {
            reject(err)
        }
    })
}

function storageSave(options, resolve) {
    chrome.storage.local.set(options, () => resolve())
}

function storageGetAllFrom(collection, resolve) {
    chrome.storage.local.get(collection, (data) => resolve(data[collection]))
}

async function findByIdThenPerform(e, callback) {
    if (e.ctrlKey) e.preventDefault()

    var id = e.target?.dataset.id || e.target?.parentNode.dataset.id || e
    var files = await promiseWrapper('files', storageGetAllFrom)

    if (!files) return false

    var index = files.findIndex(file => file.id == id)

    if (index > -1) {
        return callback(e, files, index)
    }
}

function switchButtonsActiveness(id = null, flag) {
    if (!flag) file_ids.length = 0

    if (!file_ids.includes(id) && flag) {
        file_ids.push(id)
    }

    export_file_button.disabled = !flag
    delete_file_button.disabled = !flag
    rename_file_button.disabled = !flag

    export_file_button.dataset.id = flag ? id : ''
    rename_file_button.dataset.id = flag ? id : ''
}

function readFile(e, files, index) {
    var id = e.target.dataset.id || e.target.parentNode.dataset.id

    switchButtonsActiveness(id, true)

    toggleActiveness(e)

    textarea.value = files[index].links
    filename_input.value = files[index].name

    linkPreview()
}

async function renameFile(e, files, index) {
    files[index].name = filename_input.value

    await promiseWrapper({ files: files }, storageSave)
    showFiles()
}

async function deleteFile(e, files, index) {
    files.splice(index, 1)

    await promiseWrapper({ files: files }, storageSave)
    showFiles()
}

function isExist() {
    return true
}

function getFileContents(e, files, index) {
    return files[index].links
}

function exportFile(e, files, index) {
    var filename = files[index].name
    var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(JSON.stringify(files[index]))))

    chrome.downloads.download({
        url: url,
        filename: (filename.replaceAll(':', ' ')) + '.json'
    })
}

async function addFile(new_file) {
    var files = await promiseWrapper('files', storageGetAllFrom)
    if (files) {
        files.push(new_file)
    } else {
        var files = []
        files.push(new_file)
    }
    await promiseWrapper({ files: files }, storageSave)
    showFiles()
}

async function clearAll() {
    await promiseWrapper({ files: [] }, storageSave)
    showFiles()
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

function buildFileObject(links = textarea.value) {
    var file_obj = {}
    file_obj.id = String(+ new Date())
    file_obj.time = getDate()
    file_obj.links = links

    if (!filename_input.value) {
        file_obj.name = file_obj.time
    } else {
        file_obj.name = filename_input.value
    }

    return file_obj
}

function readTabs(options = query_options) {
    chrome.tabs.query(options, function (tabs) {
        textarea.value = generateURLTitlePairs(tabs)
        filename_input.value = getDate()
        linkPreview()
        setHeight()
    })
}

select_group.addEventListener('change', function (e) {
    getTabsFromCertainGroup(e.target.value)
})

async function run() {
    var current_settings = await promiseWrapper('user_settings', storageGetAllFrom)

    if (!current_settings) {
        current_settings = default_settings
        await promiseWrapper({ user_settings: default_settings }, storageSave)
    }

    ignore_pinned_checkbox.checked = current_settings.ignore_pinned
    all_windows_checkbox.checked = current_settings.all_instances

    if (current_settings.ignore_pinned) query_options.pinned = false
    if (current_settings.all_instances) delete query_options.currentWindow

    fillSelectBox(current_settings.all_instances)
    showFiles()
}

run()

copy_button.addEventListener("click", copy)

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

export_file_button.addEventListener('click', (e) => findByIdThenPerform(e, exportFile))

import_file_button.addEventListener('click', async function () {
    var json_cnt = await pickFile(props)
    var is_exist = await findByIdThenPerform(json_cnt.id, isExist)

    if (is_exist) {
        json_cnt.id = String(+ new Date())
        json_cnt.time = getDate()
    }

    addFile(json_cnt)

    showFiles()
})

export_all_files_button.addEventListener('click', async function () {
    var files = await promiseWrapper('files', storageGetAllFrom)
    var result = JSON.stringify(files)

    var url = 'data:application/json;base64,' + btoa(unescape(encodeURIComponent(result)))
    chrome.downloads.download({
        url: url,
        filename: 'alltabs.json'
    })
})

import_all_files_button.addEventListener('click', async function () {
    var json_cnt = await pickFile(props)

    await promiseWrapper({ files: json_cnt }, storageSave)
    showFiles()
})

save_button.addEventListener('click', function () {
    var new_file = buildFileObject()
    addFile(new_file)
})

textarea.addEventListener('input', function () {
    linkPreview()
})

async function composeSettingsObject() {
    var current_settings = await promiseWrapper('user_settings', storageGetAllFrom)

    switch (this.dataset.type) {
        case 'pinned':
            current_settings.ignore_pinned = this.checked
            this.checked ? query_options.pinned = false : delete query_options.pinned
            break

        case 'windows':
            current_settings.all_instances = this.checked
            this.checked ? delete query_options.currentWindow : query_options.currentWindow = true
            break

        default:
            break
    }

    select_group.selectedIndex = 0
    deleteFolderActiveClass(file_ids.length)
    fillSelectBox(current_settings.all_instances)
    switchButtonsActiveness(false)

    await promiseWrapper({ user_settings: current_settings }, storageSave)
}

ignore_pinned_checkbox.addEventListener('change', composeSettingsObject)
all_windows_checkbox.addEventListener('change', composeSettingsObject)

merge_files_button.addEventListener('click', async function () {
    if (file_ids.length < 2) {
        alert('Select multiple files with pressed CTRL then press MERGE')

        return false
    }

    var links = ''

    for (var i = 0; i < file_ids.length; i++) {
        links += await findByIdThenPerform(file_ids[i], getFileContents)
    }

    var new_file = buildFileObject(links)
    addFile(new_file)

    switchButtonsActiveness(false)
})

delete_files_button.addEventListener('click', function () {
    if (confirm('Sure?')) {
        clearAll()
        switchButtonsActiveness(false)
    }
})

rename_file_button.addEventListener('click', function (e) {
    if (confirm('Sure?')) {
        findByIdThenPerform(e, renameFile)
        switchButtonsActiveness(false)
    }
})

delete_file_button.addEventListener('click', async function () {
    if (confirm('Sure?')) {
        for (var i = 0; i < file_ids.length; i++) {
            await findByIdThenPerform(file_ids[i], deleteFile)
        }

        switchButtonsActiveness(false)
    }
})
