var menuLeft = document.getElementById('cbp-spmenu-s1'),
				showLeftPush = document.getElementById('showLeftPush'),
				body = document.body;

$(document).ready(function () {
    //alert('I am ready');
    var myMenuState = getCookie('menuState');
    //alert('typeof: ' + typeof(myMenuState));
    //alert('myMenuState: ' + myMenuState);
    
    //myMenuState = myMenuState.replace(/\s+/g, '');
    //alert('myMenuState joind: ' + myMenuState);
    var mysearch = myMenuState.indexOf("open");
    //var mysearch = myMenuState.search("cpb-spmenu-open");
    //alert("Your cookie: " + document.cookie);
    //alert('myMenuState: ' + myMenuState);
    //alert('mysearch: ' + mysearch);

    if (mysearch >= 0) {
        //cbp-spmenu-push cbp-spmenu-push-toright
        //alert('adding push to right');
        $("body").addClass("cbp-spmenu-push-toright");
        //alert('adding cbp-spmenu-open');
        $("#cbp-spmenu-s1").addClass("cbp-spmenu-open");
    }
    else {
        //alert('removing push to right');
        $("body").removeClass("cbp-spmenu-push-toright");
        //alert('removing cbp-spmenu-open');
        $("#cbp-spmenu-s1").removeClass("cbp-spmenu-open");
    }
   
    //deleteCookie(menuState");

});
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
    }
    return "";
}

showLeftPush.onclick = function() {
    changetext2();
    classie.toggle(this, 'active');
    classie.toggle(body, 'cbp-spmenu-push-toright');
    classie.toggle(menuLeft, 'cbp-spmenu-open');
    //setting cooking to remember state of menu open or closed
    //cpb-spmenu-open appears when menu is in open state.
    //
    document.cookie = "menuState=" + $(menuLeft).attr('class');
   // alert('set cookie ' + $(menuLeft).attr('class'));
    //disableOther( 'showLeftPush' );
};


function changetext() {

    var elem = document.getElementById("showLeftPush");
    if (elem.textContent == " > > > ") {
        elem.textContent = " < < < ";
    }
    else {
        elem.textContent = " > > > ";
    }
}

function changetext2() {


    $("#showLeftPush").addClass(function (index, currentClass) {
        var addedClass;
        var n = currentClass.search("icon-angle-right");
        if (n > 0) {
            
            $("#vinceheader").removeClass("displaynone").addClass("displayblock");
            $("#showLeftPush").removeClass("icon-angle-right").addClass("icon-angle-left");
        }
        else {
            
            $("#vinceheader").removeClass("displayblock").addClass("displaynone");
            $("#showLeftPush").removeClass("icon-angle-left").addClass("icon-angle-right");
        }
        return addedClass;
    });

    
  
}

$(function SetActive () {
    $('#cbp-spmenu-s1 a').each(function () {
        if ($(this).prop('href') == window.location.href) {
            $(this).addClass('current');
        }
    });
});
