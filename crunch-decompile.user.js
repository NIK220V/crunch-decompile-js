// ==UserScript==
// @name         Crunch Sub Decompiler
// @namespace    none
// @version      1.1.0
// @description  It saves subs, yay!
// @author       https://github.com/NIK220V
// @homepage     https://github.com/NIK220V/crunch-decompile-js
// @updateURL    https://github.com/NIK220V/crunch-decompile-js/raw/master/crunch-decompile.meta.js
// @downloadURL  https://github.com/NIK220V/crunch-decompile-js/raw/master/crunch-decompile.user.js
// @match        *://*.crunchyroll.com/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/forge/0.7.1/forge.min.js
// @grant        none
// ==/UserScript==

function CrunchDecompiler(){

    var sublist, subdata = {}, decdata = {}, tocomplete = [], todecrypt = [], tosave = [];

    function getSalt(args){
        var _loc7_, _loc8_, _loc2_ = [];
        var _loc3_ = args[2];
        var _loc4_ = args[3];
        var _loc5_ = 0;
        while(_loc5_ < args[0])
        {
            _loc8_ = _loc3_ + _loc4_;
            _loc2_.push(_loc8_);
            _loc3_ = _loc4_;
            _loc4_ = _loc8_;
            _loc5_++;
        }
        var _loc6_ = "";
        for (var i = 0; i < _loc2_.length; i++)
        {
            _loc7_ = _loc2_[i];
            _loc6_ = _loc6_ + String.fromCharCode(_loc7_ % args[1] + 33);
        }
        return _loc6_;
    }

    function getNumberFromMedia(id){
        var _loc4_ = bigInt(Math.floor(Math.sqrt(6.9) * bigInt(2).pow(25))).xor(id);
        return _loc4_.xor(_loc4_.shiftRight(3)).xor(_loc4_ * 32);
    }

    function toHex(hexx) {
        var hex = hexx.toString();
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    }

    function fromHex(hex){
        return decodeURIComponent(hex.replace(/\s+/g, '').replace(/[0-9a-f]{2}/g, '%$&'));
    }

    // Декрипт сабдаты с костылями, магией и велосипедами.
    function decrypt(subdata = {id: 0, iv: '', data: ''}){
        if (decdata[subdata.id]) {
            todecrypt[0].innerText = 'Сохранение..';
            tosave.push(todecrypt[0]);
            todecrypt = todecrypt.slice(1);
            return decdata[subdata.id];
        }
        // Делаем ключ. Реально зависит только от айди медиа.
        var tohash = getSalt([20,97,1,2]) + getNumberFromMedia(subdata.id).value;
        var md = forge.md.sha1.create();
        md.update(tohash);
        var key = md.digest().toHex();
        for (var i = 0; i < 24; i++) key += "0";
        // Начинаем декрипт.
        var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.hexToBytes(key));
        decipher.start({iv: atob(subdata.iv)});
        decipher.update(forge.util.createBuffer(atob(subdata.data)));
        var result = decipher.finish();
        // Еще немного магии. Декомпресс через zlib.
        var outbytes = decipher.output.getBytes().split('').map(function(e) {
            return e.charCodeAt(0);
        });
        var inflate = new Zlib.Inflate(outbytes);
        var output = inflate.decompress();
        // Это уже полученный ответ в HEX виде.
        var hexanswer = forge.util.bytesToHex(output);
        // Возвращаем обычную UTF-8 строку.
        var normal = fromHex(hexanswer);
        decdata[subdata.id] = normal;
        todecrypt[0].innerText = 'Сохранение..';
        tosave.push(todecrypt[0]);
        todecrypt = todecrypt.slice(1);
        return normal;
    }

    // Возвращает список субтитров для ссылки.
    function getMediaXML(url, callback = function(e){console.log(e);}){
        if (sublist) {
            callback(sublist);
            return;
        }
        var mediaid = url.substring(url.lastIndexOf('-')+1);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'http://www.crunchyroll.com/xml/?req=RpcApiVideoPlayer_GetStandardConfig&click_through=0&media_id='+mediaid, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.setRequestHeader('Host', 'www.crunchyroll.com');
        xhr.setRequestHeader('X-Requested-With', 'ShockwaveFlash/28.0.0.126');
        xhr.setRequestHeader('Referer', 'http://www.crunchyroll.com/vendor/StandardVideoPlayer-10dff2a.swf');
        xhr.setRequestHeader('Origin', 'http://www.crunchyroll.com');
        xhr.setRequestHeader('Accept', '*/*');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var parser = new DOMParser();
                var xml = parser.parseFromString(xhr.responseText, "application/xml");
                var subtitles = xml.getElementsByTagName('subtitle');
                if (subtitles){
                    var subs = {};
                    for (var i = 0; i < subtitles.length; i++){
                        var sub = subtitles[i];
                        var user = sub.getAttribute('user');
                        if (user) subs[user] = {id: sub.getAttribute('id'), link: sub.getAttribute('link').replace('&amp;', '&'), user: sub.getAttribute('user'), title: sub.getAttribute('title').substring(sub.getAttribute('title').lastIndexOf(']')+2)};
                    }
                    sublist = subs;
                    callback(subs);
                }
            }
        };
        xhr.send("current_page="+url);
    }

    // Возвращает данные для декода по ссылке
    function getSubXML(url, callback = function(e){console.log(e);}){
        if (subdata[url]){
            tocomplete[0].innerText = 'Декрипт..';
            todecrypt.push(tocomplete[0]);
            tocomplete = tocomplete.slice(1);
            callback(subdata[url]);
            return;
        }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Host', 'www.crunchyroll.com');
        xhr.setRequestHeader('X-Requested-With', 'ShockwaveFlash/28.0.0.126');
        xhr.setRequestHeader('Referer', 'http://www.crunchyroll.com/vendor/StandardVideoPlayer-10dff2a.swf');
        xhr.setRequestHeader('Origin', 'http://www.crunchyroll.com');
        xhr.setRequestHeader('Accept', '*/*');
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var parser = new DOMParser();
                var xml = parser.parseFromString(xhr.responseText, "application/xml");
                var subtitle = xml.getElementsByTagName('subtitle')[0];
                var sub = {id: subtitle.getAttribute('id'), iv: subtitle.children[0].innerHTML, data: subtitle.children[1].innerHTML};
                tocomplete[0].innerText = 'Декрипт..';
                todecrypt.push(tocomplete[0]);
                tocomplete = tocomplete.slice(1);
                subdata[url] = sub;
                callback(sub);
            }
        };
        xhr.send(null);
    }

    function _init(){
        var css = document.createElement('style');
        css.id = 'crunch-style';
        css.type = 'text/css';
        css.innerText = `.crunch_parent{  z-index: 1000000;  /* width: 640px;   height: 480px;*/  position: absolute;  margin-top: -240px;  margin-left: -200px;  top: 50%;  left: 50%;  background: rgb(17, 17, 17);  border-radius: 25px;  border: 2px rgb(36,36,36) solid;  color: white;padding: 10px;text-align: center;}
                         .crunch_option{  border: 1px rgb(35,35,35) solid;  border-radius: 15px;  padding: 5px;  margin-bottom: 5px;}
                         .crunch_button{  padding: 3px 10px 3px;  cursor: pointer;  background: none;  background-color: green;  color: #fff;  border: 0;  border-radius: 4px;  margin: 4px;}
                         .crunch_close{  padding: 3px 10px 3px;  cursor: pointer;  background: none;  background-color: rgb(71,71,71);  color: #fff;  border: 0;  border-radius: 4px;  margin: 4px;}`;
        document.head.appendChild(css);
        var libs = ['https://cdnjs.cloudflare.com/ajax/libs/big-integer/1.6.26/BigInteger.min.js', 'https://cdn.rawgit.com/imaya/zlib.js/develop/bin/inflate.min.js'];
        for (var i = 0; i < libs.length; i++){
            var u = document.createElement('script');
            u.type = 'text/javascript';
            u.id = 'crunchlibs_'+i;
            u.src = libs[i];
            document.head.appendChild(u);
        }
        var e = document.getElementById('showmedia_video_box'), c = document.getElementById('showmedia_video');
        if (e || c){
            var btn = document.createElement('a');
            btn.className = 'orange-button button default-button medium-button button-padding right';
            btn.innerText = 'Получить субтитры';
            btn.onclick = function(){
                getMediaXML(location.href, function(e){showGreatDiv(e);});
            };
            document.querySelector('#showmedia_video > div.video-quality.cf > div.right.clearfix').appendChild(btn);
        }
    }

    // Показывает окошко
    function showGreatDiv(subs){
        console.log(subs);
        var div = document.createElement('div');
        div.id = 'crunch';
        if (document.getElementById(div.id)) document.getElementById(div.id).remove();
        div.className = 'crunch_parent';
        div.style.display = 'none';
        for (var i = 0; i < Object.keys(subs).length; i++){
            var sub = subs[Object.keys(subs)[i]];
            var option = document.createElement('div');
            option.className = 'crunch_option';
            option.innerHTML = 'Субтитры для языка <b>'+sub.title+'</b>';
            var btn = document.createElement('button');
            btn.className = 'crunch_button';
            btn.innerText = 'Скачать';
            btn.subs = sub;
            btn.onclick = function(e){
                this.innerText = 'Загрузка..';
                tocomplete.push(this);
                getSubXML(this.subs.link, saveSubs);
                e.preventDefault();
                return false;
            };
            option.appendChild(btn);
            div.appendChild(option);
        }
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
    function saveSubs(subdata){
        function q(a, b){return a.getAttribute(b);}
        var xmld = decrypt(subdata);
        var xml = new DOMParser().parseFromString(xmld, "application/xml");
        var str = "[Script Info]\n; Script generated by CrunchDecompile\n; https://nnmclub.to/\nTitle: "+location.href+" by CrunchDecompile\nScriptType: v4.00+\nWrapStyle: "+q(xml.getElementsByTagName('subtitle_script')[0], 'wrap_style')+"\nPlayResX: "+q(xml.getElementsByTagName('subtitle_script')[0], 'play_res_x')+"\nPlayResY: "+q(xml.getElementsByTagName('subtitle_script')[0], 'play_res_y')+"\nScaledBorderAndShadow: yes";
        str += "\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding";
        for (var i = 0; i < xml.getElementsByTagName('style').length; i++){
            var style = xml.getElementsByTagName('style')[i];
            str += "\nStyle: " + q(style, 'name') + "," + q(style, 'font_name') + "," + q(style, 'font_size') + "," + q(style, 'primary_colour') + "," + q(style, 'secondary_colour') + "," + q(style, 'outline_colour') + "," + q(style, 'back_colour') + "," + q(style, 'bold') + "," + q(style, 'italic') + "," + q(style, 'underline') + "," + q(style, 'strikeout') + "," + q(style, 'scale_x') + "," + q(style, 'scale_y') + "," + q(style, 'spacing') + "," + q(style, 'angle') + "," + q(style, 'border_style') + "," + q(style, 'outline') + "," + q(style, 'shadow') + "," + q(style, 'alignment') + "," + q(style, 'margin_l') + "," + q(style, 'margin_r') + "," + q(style, 'margin_v') + "," + q(style, 'encoding');
        }
        str += "\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text";
        for (var i = 0; i < xml.getElementsByTagName('event').length; i++){
            var event = xml.getElementsByTagName('event')[i];
            str += "\nDialogue: 0,"+q(event, 'start')+","+q(event, 'end')+","+q(event, 'style')+","+q(event, 'name')+","+q(event, 'margin_l')+","+q(event, 'margin_l')+","+q(event, 'margin_v')+","+q(event, 'effect')+","+q(event, 'text');
        }
        str += "\n";
        var saver = document.createElement('a');
        saver.href = 'data:application/xml;charset=utf-8,'+ '\ufeff' + str;
        saver.download = getTitle()+'.'+subdata.id+'.ass';
        saver.innerText = '{save}';
        saver.click();
        tosave[0].innerText = 'Готово';
        tosave = tosave.slice(1);
    }

    // Выдает название серии. Заменяет некоторые мешающие символы.
    function getTitle(){
        var name = document.querySelector('#template_body > div.new_layout.new_layout_wide > div.showmedia-trail.cf > div > h1');
        if (name) name = name.innerText; else {var t = document.querySelector('#template_body > div:nth-child(6) > div.showmedia-trail.cf > div > h1'); if (t) name = t.innerText;}
        if (name) name = name.replace(/:/gi, '').replace(/\//gi, '').replace(/\|/gi, '').replace(/\./gi, ''); else name = 'title not found';
        return name;
    }

    return {
        getSalt: getSalt,
        getNumberFromMedia: getNumberFromMedia,
        toHex: toHex,
        fromHex: fromHex,
        decrypt: decrypt,
        getMediaXML : getMediaXML,
        getSubXML: getSubXML,
        _init: _init,
        showGreatDiv: showGreatDiv,
        saveSubs: saveSubs,
        getTitle: getTitle
    };

}

setTimeout(function(){
    new CrunchDecompiler()._init();
}, 250);