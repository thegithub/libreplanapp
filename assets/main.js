/*
 * LibrePlan App
 *
 * Copyright (C) 2012  Manuel Rego Casasnovas <rego@igalia.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Boun user web services path
var PATH = 'ws/rest/bounduser/';

// Global vars
var url;
var username;
var baseAuth;
var projects;
var timesheetsEntries;

var finishedTasks = false;

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    reloadStoredConfiguration();
    setConfigurationInputs();
    updateFinishedTasksButtonsVisibility();
    refreshTasksList();
}

function updateFinishedTasksButtonsVisibility() {
    if (finishedTasks) {
        $("#show-finished").hide();
        $("#hide-finished").show();
    } else {
        $("#show-finished").show();
        $("#hide-finished").hide();
    }
}

function isOnline() {
    var networkState = navigator.network.connection.type;
    return (networkState != Connection.NONE);
}

function makeBaseAuth(user, password) {
    var token = user + ':' + password;
    var hash = btoa(token);
    return 'Basic ' + hash;
}

function offLineCallback() {
	refreshTasksList();
}

function refreshTasksList() {
    if (!isOnline()) {
        navigator.notification.alert(
                'Sorry but you have to be on-line in order to use LibrePlan App',
                offLineCallback,
                'Off-line',
                'Ok'
            );
        return;
    }

    serviceUrl = url + PATH + 'mytasks';

    $.ajax({
        type: 'GET',
        url: serviceUrl,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', baseAuth);
        }
    }).done(function(data) {
        var tasksList = data.firstChild;

        projects = new Array();

        for (i = 0; i < tasksList.childNodes.length; i++) {
            var taskData = tasksList.childNodes[i];

            projectId = taskData.getAttribute('project-name');
            var project = findProjectById(projectId);

            if (!project) {
                project = {
                    name: taskData.getAttribute('project-name'),
                    allTasksFinished: true,
                    tasks: new Array(),
                    unfinishedTasks: 0,
                };
                projects.push(project);
            }

            var task = {
                    name: taskData.getAttribute('name'),
                    code: taskData.getAttribute('code'),
                    startDate: taskData.getAttribute('start-date'),
                    endDate: taskData.getAttribute('end-date'),
                    effort: taskData.getAttribute('effort'),
                    progressValue: taskData.getAttribute('progress-value'),
                    progressDate: taskData.getAttribute('progress-date'),
            };

            if (!isTaskFinished(task)) {
                project.allTasksFinished = false;
                project.unfinishedTasks++;
            }

            project.tasks.push(task);
        }

        fillTaskLists();
    }).fail(function() {
        navigator.notification.alert(
            'Problems connecting to LibrePlan server',
            goToConfiguration,
            'Error',
            'Ok'
        );
    });
}

function findProjectById(projectId) {
    for (var i = 0; i < projects.length; i++) {
        if (projects[i].name == projectId) {
            return projects[i];
        }
    }
    return null;
}

function fillTaskLists() {
    var list = $('#tasks-list');
    list.html('');

    for (var i = 0; i < projects.length; i++) {
        var project = projects[i];
        if (!finishedTasks && project.allTasksFinished) {
            continue;
        }

        list.append(createLiProject(project));

        for ( var i = 0; i < project.tasks.length; i++) {
            var task = project.tasks[i];
            if (!finishedTasks) {
                if (isTaskFinished(task)) {
                    continue;
                }
            }
            list.append(createLiTask(task));
        }
    }

    list.listview('destroy').listview();
}

function isTaskFinished(task) {
    var progress = task.progressValue;
    if (!progress) {
        return false;
    }
    return parseInt(progress) == "100";
}

function createLiProject(project) {
    var li = $('<li data-role="list-divider" />');
    var tasksNumber = finishedTasks ? project.tasks.length : project.unfinishedTasks;
    li.html(project.name + ' <span class="ui-li-count">' + tasksNumber + '</span>');
    return li;
}

function createLiTask(task) {
    var a = $('<a onClick="showTimesheets(\'' + task.code + '\', \'' + task.name + '\');" />');
    $('<h3 />').append(task.name).appendTo(a);
    $('<p />').append($('<strong />').append('Effort: ' + task.effort)).appendTo(a);
    $('<p />').append('Dates: ' + task.startDate + ' - ' + task.endDate).appendTo(a);
    $('<p class="ui-li-aside" />').append(toPercentage(task.progressValue)).appendTo(a);

    var li = $('<li />');
    li.append(a);
    return li;
}

function toPercentage(progress) {
    if (!progress) {
        progress = 0;
    }
    return parseInt(progress) + ' %';
}

function saveConfiguration() {
    var url = $('#url').val();
    window.localStorage.setItem('url', url);

    var username = $('#username').val();
    window.localStorage.setItem('username', username);

    var password = $('#password').val();
    var baseAuth = makeBaseAuth(username, password);
    window.localStorage.setItem('baseAuth', baseAuth);

    reloadStoredConfiguration();
    refreshTasksList();
}

function reloadStoredConfiguration() {
    url = window.localStorage.getItem('url');
    username = window.localStorage.getItem('username');
    baseAuth = window.localStorage.getItem('baseAuth');
}

function setConfigurationInputs() {
    $('#url').val(url);
    $('#username').val(username);
}

function goToConfiguration() {
    $.mobile.changePage('#configuration');
}

function showFinished() {
    finishedTasks = true;
    updateFinishedTasksButtonsVisibility();
    fillTaskLists();
}

function hideFinished() {
    finishedTasks = false;
    updateFinishedTasksButtonsVisibility();
    fillTaskLists();
}

function showTimesheets(taskCode, taskName) {
    $.mobile.changePage('#timesheets');

    serviceUrl = url + PATH + 'timesheets/' + taskCode;

    $.ajax({
        type: 'GET',
        url: serviceUrl,
        beforeSend: function (xhr) {
            xhr.setRequestHeader('Authorization', baseAuth);
        }
    }).done(function(data) {
        var entriesList = data.firstChild;

        timesheetsEntries = new Array();

        for (i = 0; i < entriesList.childNodes.length; i++) {
            var entry = entriesList.childNodes[i];

            var timesheetEntry = {
                    date: entry.getAttribute('date'),
                    effort: entry.getAttribute('effort'),
            };

            timesheetsEntries.push(timesheetEntry);
        }

        $('#timesheets-task').html(taskName);
        fillTimesheetsList();
    });
}

function fillTimesheetsList() {
    var list = $('#timesheets-list');
    list.html('');

    for (var i = 0; i < timesheetsEntries.length; i++) {
        var entry = timesheetsEntries[i];
        list.append(createLiTimesheetEntry(entry));
    }

    list.listview('destroy').listview();
}

function createLiTimesheetEntry(entry) {
    var li = $('<li />');
    $('<h3 />').append(entry.date).appendTo(li);
    $('<p />').append($('<strong />').append('Effort: ' + entry.effort)).appendTo(li);
    return li;
}
