/* ==================================================================
   PIXEL SPRITE-OK
   Minden karakter egy betű = egy pixel. A színeket a PAL adja meg,
   a '.' átlátszó. Az eredményt PNG data-URL-ként adja vissza.
   ================================================================== */

const SPRITES = (() => {
  const PAL = {
    k: '#1b1b2f', // körvonal
    e: '#1b1b2f', // szem
    o: '#f4a03a', // narancs bunda
    d: '#c8691c', // csík
    w: '#fff1dc', // krém
    p: '#ff86b0', // rózsaszín
    r: '#e63946', // MX-5 piros
    R: '#a4161a', // sötétpiros
    g: '#9be7ff', // üveg
    t: '#26262e', // gumi
    s: '#c9ccd6', // felni
    y: '#ffe066', // fényszóró
  };

  const catBody = [
    '............k...k..',
    '..kk.......kpk.kpk.',
    '.kook......koooook.',
    '.kok.......koeoeok.',
    '.kok.......koopook.',
    '.kokkkkkkkkkwwwwwk.',
    '..koodoodoookkkkk..',
    '..koodoodoook......',
    '..kooowwwwook......',
    '...kokkkkkok.......',
  ];

  const carTop = [
    '...........kpk.kpk............',
    '...........koooook.k..........',
    '...........koeoeok.kg.........',
    '...........koopook.kgg........',
  ];
  const carTopOpen = [
    '...........kpk.kpk............',
    '...........koooook.k..........',
    '...........koeoeok.kg....kkk..',
    '...........koopook.kgg...kyk..',
  ];
  const carBottom = [
    '..' + 'k'.repeat(26) + '..',
    '.k' + 'r'.repeat(26) + 'k.',
    '.k' + 'r'.repeat(9) + 'R' + 'r'.repeat(6) + 'R' + 'r'.repeat(9) + 'k.',
    '.k' + 'rr' + 'k'.repeat(6) + 'r'.repeat(10) + 'k'.repeat(6) + 'rr' + 'k.',
    '.kkk' + '.tttt.' + 'k'.repeat(10) + '.tttt.' + 'kkk.',
    '....' + 'ttsstt' + '.'.repeat(10) + 'ttsstt' + '....',
    '....' + 'ttsstt' + '.'.repeat(10) + 'ttsstt' + '....',
    '.....' + 'tttt' + '.'.repeat(12) + 'tttt' + '.....',
  ];

  const GRIDS = {
    // macska, két lépésfázis
    catA: catBody.concat([
      '...kok...kok.......',
      '...kwk...kwk.......',
      '...kkk...kkk.......',
    ]),
    catB: catBody.concat([
      '..kok.....kok......',
      '..kwk.....kwk......',
      '..kkk.....kkk......',
    ]),
    // MX-5 macskával, csukott és nyitott pop-up lámpával
    mx5: carTop.concat(carBottom),
    mx5open: carTopOpen.concat(carBottom),
  };

  const cache = {};

  function url(name, scale = 4) {
    const key = name + '@' + scale;
    if (cache[key]) return cache[key];
    const rows = GRIDS[name];
    const w = Math.max(...rows.map(r => r.length));
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = rows.length * scale;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        const col = PAL[ch];
        if (!col) return;
        g.fillStyle = col;
        g.fillRect(x * scale, y * scale, scale, scale);
      });
    });
    return (cache[key] = c.toDataURL());
  }

  return { url };
})();
