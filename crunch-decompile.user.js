// ==UserScript==
// @name         Crunch Sub Decompiler
// @namespace    none
// @version      2.0.0
// @description  It saves subs, yay!
// @author       https://github.com/NIK220V
// @homepage     https://github.com/NIK220V/crunch-decompile-js
// @updateURL    https://github.com/NIK220V/crunch-decompile-js/raw/master/crunch-decompile.meta.js
// @downloadURL  https://github.com/NIK220V/crunch-decompile-js/raw/master/crunch-decompile.user.js
// @match        *://*.crunchyroll.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.js
// @grant        none
// ==/UserScript==

function CrunchDecompiler(){

    var EpisodeData = {};

    // Парсит данные эпизода - ссылки на сабы и так далее
    function collectData(){
        var page = document.body.innerHTML;
        var bindex = page.indexOf('vilos.config.media = {') + 21;
        var endex = page.indexOf(';', bindex);
        page = page.substring(bindex, endex);
        EpisodeData = JSON.parse(page);
    }

    // Получает текст сабов по ссылке
    function getSubtitles(url, callback = function(e){console.log(e);}, btn){
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.setRequestHeader('DNT', '1');
        xhr.setRequestHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
        xhr.setRequestHeader('Referer', 'https://static.crunchyroll.com/vilos/libass/both/subtitles-octopus-worker.js');
        xhr.setRequestHeader('Origin', 'null');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(xhr.responseText, btn);
            }
        };
        xhr.send(null);
    }

    function _init(){
        collectData();
        var css = document.createElement('style');
        css.id = 'crunch-style';
        css.type = 'text/css';
        css.innerText = `.crunch_parent{  z-index: 1000000;  /* width: 640px;   height: 480px;*/  position: absolute;  margin-top: -240px;  margin-left: -200px;  top: 50%;  left: 50%;  background: rgb(17, 17, 17);  border-radius: 25px;  border: 2px rgb(36,36,36) solid;  color: white;padding: 10px;text-align: center;}
                         .crunch_option{  border: 1px rgb(35,35,35) solid;  border-radius: 15px;  padding: 5px;  margin-bottom: 5px;}
                         .crunch_button{  padding: 3px 10px 3px;  cursor: pointer;  background: none;  background-color: green;  color: #fff;  border: 0;  border-radius: 4px;  margin: 4px;}
                         .crunch_close{  padding: 3px 10px 3px;  cursor: pointer;  background: none;  background-color: rgb(71,71,71);  color: #fff;  border: 0;  border-radius: 4px;  margin: 4px;}`;
        document.head.appendChild(css);
        var e = document.getElementById('showmedia_video_box'), c = document.getElementById('showmedia_video');
        if (e || c){
            var btn = document.createElement('button');
            btn.className = 'add-queue-button not-queued js-add-queue-button';
            btn.style.background = 'orange';
            btn.style.marginLeft = '10px';
            btn.style.opacity = '1';
            btn.innerHTML = '<div class="firefox-flex-fix" style="opacity: 1;"><svg class="queue-icon" viewBox="0 0 48 48" style="opacity: 1;"><use xlink:href="/i/svg/queue_buttons.svg#cr_bookmark" style="opacity: 1;"></use></svg><span class="queue-label" style="opacity: 1;">Получить субтитры</span></div>';
            btn.onclick = function(){
                showGreatDiv();
            };
            var p = document.querySelector('#sharing_add_queue_button');;
            p.parentNode.insertBefore(btn, p);
        }
    }

    // Показывает окошко
    function showGreatDiv(){
        var div = document.createElement('div');
        div.id = 'crunch';
        if (document.getElementById(div.id)) document.getElementById(div.id).remove();
        div.className = 'crunch_parent';
        div.style.display = 'none';
        EpisodeData.subtitles.forEach(sub => {
            var option = document.createElement('div');
            option.className = 'crunch_option';
            option.innerHTML = 'Субтитры для языка <b>'+sub.title+'</b>';
            var btn = document.createElement('button');
            btn.className = 'crunch_button';
            btn.innerText = 'Скачать';
            btn.sublink = sub.url;
            btn.onclick = function(e){
                this.innerText = 'Загрузка..';
                getSubtitles(this.sublink, saveSubs, this);
                e.preventDefault();
                return false;
            };
            option.appendChild(btn);
            div.appendChild(option);
        });

        var btn = document.createElement('button');
        btn.className = 'crunch_close';
        btn.innerText = 'Закрыть';
        btn.onclick = function(e){
            $(div).fadeOut(500, function(){this.remove();});
            e.preventDefault();
            return false;
        };
        div.appendChild(btn);
        document.body.appendChild(div);
        $(div).fadeIn(500);
    }

    // Сохраняет сабы в файл.
    function saveSubs(text, btn){
        var saver = document.createElement('a');
        saver.href = 'data:application/xml;charset=utf-8,\ufeff' + text;
        saver.download = getTitle()+'.'+EpisodeData.metadata.id+'.ass';
        saver.innerText = '{save}';
        saver.click();
        if (btn) btn.innerText = 'Готово';
    }

    // Выдает название серии. Заменяет некоторые мешающие символы.
    function getTitle(){
        var name = document.querySelector('h1[class="ellipsis"]').innerText;
        // Legacy code // if (name) name = name.innerText; else {var t = document.querySelector('#template_body > div:nth-child(6) > div.showmedia-trail.cf > div > h1'); if (t) name = t.innerText;}
        if (name) name = name.replace(/:/gi, '').replace(/\//gi, '').replace(/\|/gi, '').replace(/\./gi, ''); else name = 'title not found';
        return name;
    }

    return {
        _init: _init,
        showGreatDiv: showGreatDiv,
        saveSubs: saveSubs,
        getTitle: getTitle
    };

}

setTimeout(function(){
    new CrunchDecompiler()._init();
}, 250);
