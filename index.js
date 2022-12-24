(async () => {
    const {importAll, getScript} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await Promise.all([
        'https://code.jquery.com/jquery-3.3.1.min.js',
    ].map(getScript));
    const {$, MidiParser} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('MIDI program change');
    $('<h2>').appendTo(head).text('プログラムチェンジの実行');
    const rpgen3 = await importAll([
        'input',
        'css',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    const rpgen4 = await importAll([
        'https://rpgen3.github.io/nsx39/mjs/midiOutput/MidiOutput.mjs',
    ].flat());
    Promise.all([
        'container',
        'tab',
        'img',
        'btn'
    ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`).map(rpgen3.addCSS));
    const hideTime = 500;
    const addHideArea = (label, parentNode = main) => {
        const html = $('<div>').addClass('container').appendTo(parentNode);
        const input = rpgen3.addInputBool(html, {
            label,
            save: true,
            value: true
        });
        const area = $('<dl>').appendTo(html);
        input.elm.on('change', () => input() ? area.show(hideTime) : area.hide(hideTime)).trigger('change');
        return Object.assign(input, {
            get html(){
                return area;
            }
        });
    };
    const addLabeledText = (html, {label, value}) => {
        const holder = $('<dd>').appendTo(html);
        $('<span>').appendTo(holder).text(label);
        const content = $('<span>').appendTo(holder).text(value);
        return value => content.text(value);
    };
    let selectMidiChannel = null;
    let g_midiOutput = new rpgen4.MidiOutput();
    window.g_midiOutput = g_midiOutput;
    {
        const {html} = addHideArea('init');
        const viewStatus = addLabeledText(html, {
            label: '状態：',
            value: '未接続'
        });
        rpgen3.addBtn(html, 'MIDI出力デバイスに接続', async () => {
            try {
                const midiOutputs = await g_midiOutput.fetchMidiOutputs();
                selectMidiOutput.update([...midiOutputs].map(([_, v]) => [v.name, v]));
                viewStatus('接続成功');
            } catch (err) {
                console.error(err);
                viewStatus('接続失敗');
            }
        }).addClass('btn');
        const selectMidiOutput = rpgen3.addSelect(html, {
            label: 'MIDI出力デバイスを選択'
        });
        selectMidiOutput.elm.on('change', () => {
            g_midiOutput.midiOutput = selectMidiOutput();
        });
        selectMidiChannel = rpgen3.addSelect(html, {
            label: '出力先のチャンネルを選択',
            save: true,
            list: [
                ['全てのチャンネル', null],
                ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(v => [`Ch.${v}`, v - 1])
            ]
        });
        $('<dd>').appendTo(html);
        rpgen3.addBtn(html, '出力テスト(C5)', () => {
            try {
                const channel = selectMidiChannel();
                g_midiOutput.noteOn({
                    data: {channel, pitch: 0x48, velocity: 100}
                });
                g_midiOutput.noteOn({
                    data: {channel, pitch: 0x48, velocity: 0},
                    timestamp: performance.now() + 500
                });
            } catch (err) {
                console.error(err);
                alert(err);
            }
        }).addClass('btn');
    }
    const GM_list = await (async () => {
        const list = (await (await fetch('https://rpgen3.github.io/programChange/GM.txt')).text())
            .split('\n').filter(v => v[0] !== '#' && v.length).slice(1).map(v => v.split('|'));
        const GM_list = [];
        let arr = null;
        for (const v of list) {
            if (v.length === 1) {
                arr = [v[0], []];
                GM_list.push(arr);
            } else if (v.length === 4) {
                arr[1].push([`${v[1]} ${v[3]}`, Number(v[0]) - 1]);
            }
        }
        return GM_list;
    })();
    {
        const {html} = addHideArea('playing');
        const viewStatus = addLabeledText(html, {
            label: '終了予定：',
            value: '未定'
        });
        $('<dd>').appendTo(html);
        rpgen3.addBtn(html, '音色の初期化', async () => {
            g_midiOutput.allChannels.programChange({data: {programChange: 0x00}});
            viewStatus('音色を初期化した');
        }).addClass('btn');
        rpgen3.addBtn(html, '音色の設定', async () => {
            for (let i = 0; i < 0x10; i++) {
                g_midiOutput.programChange({data: {programChange: selectPrograms[i]()}});
            }
            viewStatus('音色を初期化した');
        }).addClass('btn');
        const selectPrograms = [...Array(0x10).keys()].map(v => rpgen3.addSelectGroup(html, {
            label: `Ch.${v + 1}`,
            save: true,
            list: GM_list
        }));
    }
})();