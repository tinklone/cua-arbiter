function deleteAllCookies() {
    let cookies = document.cookie.split(";");

    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        let eqPos = cookie.indexOf("=");
        let name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
}

function getusername() {
    let storage = window.localStorage;
    let username = storage['username'];
    return username ? username : "guest";

}

var model_list = null;
var case_list = null;
$(document).ready(function () {

    let username = getusername();
    // new Vue({
    //     el: '#username',
    //     data: {
    //         message: username
    //     }
    // });

    // Vue.component('parent-component', {
    //     props: ['todo'],
    //     template: '<li class="no-padding green darken-4"><ul class="collapsible collapsible-accordion"><li class="bold"><a class="collapsible-header waves-effect waves-teal">{{ todo.text }}</a><div class="collapsible-body"><ul><div><case-list id="nav-slide-case" ></case-list></div></ul></div></li></ul></li>'
    // ,
    //     components: {
    //         'caseList': {
    //             el: '#nav-slide-case',
    //             props: ['todo'],
    //             template: '<li class="green darken-2"><a href="#" case-role="{{ key }}">{{ todo.text }}</a></li>',
    //             data: {
    //                 caseList: [
    //                     {id: 0, text: '1'},
    //                     {id: 1, text: '2'},
    //                     {id: 2, text: '3'}
    //                 ]
    //             }
    //         }
    //
    //     }
    // });
// new Vue({
//         props: ['todo'],
//      el: '#nav-slide-case',
//         // template:  '<li class="green darken-2"><a href="#" case-role="{{ key }}">{{ todo.text }}</a></li>'
//     });

    fetch("./getCaseList",
        {
            method: "POST",
            credentials: "same-origin",
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json'
            }
        }).then(response => {
        if (response.status !== 200) {
            console.log("存在一个问题，状态码为：" + response.status);
            return false;
        }
        else
            return response.json();

    }).then(
        json => {
            model_list = json["model_list"];
            case_list = json["case_list"];
            let app3 = new Vue({
                props: ['todo'],
                el: '#nav-slide-case',
                data: {
                    caseList: case_list
                }
            });

            let app7 = new Vue({
                props: ['todo'],
                el: '#nav-slide',
                data: {
                    modelList: model_list
                }
            });
            $('.collapsible').collapsible();
            $(".collapsible-body li").click(function () {
                //guide 显示到隐藏，root-case从隐藏到显示
                $("#root-guide"
                ).hide();
                $("#root-case").show();
                $(".collapsible-body .active").removeClass("active");
                $(event.currentTarget).addClass("active");
                // let casepath = $(event.currentTarget).children("a").attr("case-role").split("/");
                let casefullname = $(event.currentTarget).children("a").attr("case-role");
                $("#casepath").attr("casepath", casefullname);//给自定义casepath属性设置为路径全名
//设置标题显示用例类名+方法名
                let caseclassname = casefullname.split(":")[1];
                $("#case_sumary_name").text(caseclassname);
//读取用例文件,并设置codeContent
                let caseNamePathList = casefullname.split("/");//获取用例路径，解析内容
                let caseNamePath = caseNamePathList[caseNamePathList.length - 1].split(":")[0].split(".").join("/") + ".py";
                document.getElementById("code-content").style.fontSize = "14px";
                let codeContent = ace.edit("code-content");
                codeContent.setTheme("ace/theme/github");
                codeContent.setReadOnly(true);//设置只读
                codeContent.session.setMode("ace/mode/python");
                setBtn("edit");
                /*查询可编辑状态*/
                new ValidateEditWebSocket(caseNamePath);
                let xhr = new XMLHttpRequest();
                xhr.open('GET', '/static/' + caseNamePath, true);
                xhr.setRequestHeader("If-Modified-Since", "0");
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        codeContent.setValue(xhr.responseText, -1);//设置显示内容，并将光标移动到start处
                        //文件加载成功后，监听按钮点击
                        $("#run").unbind('click').click(function () {
                            const storage = window.localStorage;
                            if (!storage['token']) {
                                window.location.href = "login";
                            }
                            RunWebSocketTest();
                            $('#modal_log').modal('open');
                        });

                        let edit_selector = $("#edit");

                        //编辑
                        edit_selector.unbind('click').click(function () {
                            const storage = window.localStorage;
                            if (!storage['token']) {
                                window.location.href = "login";
                            }
                            let codeContent = ace.edit("code-content");
                            if (edit_selector.find("span").text() === "编辑") {
                                new ValidateEditWebSocket();
                                /* 根据返回的结果处理*/
                                codeContent.setReadOnly(false);//设置为可编辑模式
                                codeContent.setTheme("ace/theme/chrome");//设置可编辑状态主题
                                return setBtn("save");
                            } else if ($("#edit").find("span").text() === "保存") {
                                //点击保存，不刷新按钮，调后端保存文件，成功后返回
                                //打开保存进度框
                                let modalConfig = {
                                    dismissible: false, // Modal can be dismissed by clicking outside of the modal
                                    opacity: .7,
                                    complete: function () {
                                        $("#pro-loading" + " > div").html("");
                                    } // Callback for Modal close// Opacity of modal background
                                };
                                /*设置保存模态框效果*/
                                $("#modal-save").modal("open", modalConfig);
                                //设置正常速度魔兽进度条加载
                                doProgress();

                                let newCodeContent = codeContent.getValue();
                                fetch("/arbiter/save/",
                                    {
                                        method: "POST",
                                        credentials: "same-origin",
                                        headers: {
                                            "X-CSRFToken": getCookie("csrftoken"),
                                            'Accept': 'application/json, text/plain, */*',
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({casepath: casefullname, content: newCodeContent})
                                    }).then(function (response) {
                                    if (response.status !== 200) {
                                        console.log("存在一个问题，状态码为：" + response.status);
                                        return;
                                    }
                                    //检查响应文本
                                    response.json().then(function (data) {
                                        if (data['result'] === "ok") {
                                            process_speed = 1;

                                        } else {
                                            alert("保存失败！");
                                        }
                                    });
                                }).catch(function (err) {
                                    console.log("Fetch错误:" + err);

                                })
                            }
                        });
                    }
                }
                ;
                xhr.send(null);
            })
        }
    );


    // let app3 = new Vue({
    //     props: ['todo'],
    //     el: '#nav-slide-case',
    //     data: {
    //         caseList: case_list
    //     }
    // });
    //
    // let app7 = new Vue({
    //     props: ['todo'],
    //     el: '#nav-slide',
    //     data: {
    //         modelList: model_list
    //     }
    // });
    // $('.collapsible').collapsible();
    $("#logout").click(function (e) {

        e.preventDefault(e);
        deleteAllCookies();
        let storage = window.localStorage;
        storage.clear();
        window.location.href = ".";
    });


    ;
});


/**
 * 验证是否可编辑
 * @constructor
 */
function ValidateEditWebSocket(fileName) {
    if ("WebSocket" in window) {
        let socket = new WebSocket("ws://" + window.location.host + "/arbiter/");
        socket.onmessage = function (e) {
            console.log(e.data);

        };
        socket.onopen = function () {
            //发送validateEdit 0 查询
            socket.send("validateEdit 0 " + fileName);
        };
        // Call onopen directly if socket is already open
        if (socket.readyState === WebSocket.OPEN)
            socket.onopen();
    }
    else {
        // 浏览器不支持 WebSocket
        alert("您的浏览器不支持 WebSocket!");
    }
}

function RunWebSocketTest() {
    let casename = getCaseName();
    if ("WebSocket" in window) {
        let socket = new WebSocket("ws://" + window.location.host + "/arbiter/");
        socket.onmessage = function (e) {
            document.getElementById("insert").innerHTML += "<li><a>" + e.data + "</a></li>";

        };
        socket.onopen = function () {
            socket.send("runCase " + casename);
        };
        // Call onopen directly if socket is already open
        if (socket.readyState === WebSocket.OPEN)
            socket.onopen();
    }
    else {
        // 浏览器不支持 WebSocket
        alert("您的浏览器不支持 WebSocket!");
    }
}

/**
 * 获取caseName
 * @returns {jQuery}
 */
function getCaseName() {
    return $("#casepath").attr("casepath");

}

function setBtn(type) {
    if (type === "save") {
        //设置为保存按钮状态
        $("#edit").find("span").text("保存");
        $("#save-edit-icon").text("done");
    }
    if (type === "edit") {
        //设置为保存按钮状态
        $("#edit").find("span").text("编辑");
        $("#save-edit-icon").text("mode_edit");
    }
}

let process_value = 0;
let process_speed = 0;//0正常，1代表收到保存成功，加快
function doProgress() {
    if (process_speed === 0) {
        if (process_value === 95) {//正常速度下，如果进度95%，则不继续加载
            setTimeout(doProgress, 300);
            setProgress(process_value);
        } else if (process_value < 65) {
            setTimeout(doProgress, 300);
            setProgress(process_value);
            process_value++;
        } else if (process_value < 85) {
            setTimeout(doProgress, 100);
            setProgress(process_value);
            process_value++;
        } else if (process_value < 95) {
            setTimeout(doProgress, 300);
            setProgress(process_value);
            process_value++;
        }

    } else if (process_speed === 1) {//保存成功信号，加快速度
        //如果加到100，stop
        if (process_value === 100) {
            setProgress(process_value);
            $(".modal-save-footer").show();
            let timeoutid = setTimeout(doProgress, 300);
            clearTimeout(timeoutid);
            process_value = 0;
            process_speed = 0;
        } else {
            setProgress(process_value);
            setTimeout(doProgress, 10);
            process_value++;
        }

    }
}

/**
 * 解决csrf问题
 * @param name
 * @returns {*}
 */
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        let cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/*进度条*/
function setProgress(progress) {
    let progress_id = "pro-loading";
    if (progress) {
        let jq_progress_id = $("#" + progress_id + " > div");
        jq_progress_id.css("width", String(progress) + "%"); //控制#loading div宽度
        // $("#" + progress_id + " > div").html(String(progress) + "%"); //显示百分比
        jq_progress_id.html("保存中");
    }
}
