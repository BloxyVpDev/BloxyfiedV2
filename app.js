/* Bloxyfied shared logic. Everything is stored in this browser's localStorage. */
const Bx = (() => {
  const K = { users: 'bloxyfied_users_v1', session: 'bloxyfied_session_v1', sales: 'bloxyfied_sales_v1', listings: 'bloxyfied_listings_v1', stock: 'bloxyfied_stock_v1', chat: 'bloxyfied_chat_v1', token: 'bloxyfied_token_v1', remote: 'bloxyfied_remote_v1', players: 'bloxyfied_players_v1' };
  const DAY = 86400000;
  const WELCOME_BX = 500; // free Bx for every new account

  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const fmt = n => Number(n).toLocaleString('en-US');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const level = xp => Math.floor(xp / 1000) + 1;

  const PLANS = {
    basic:    { key: 'basic',    name: 'Purple Basic',    price: 1,  per: 'Day',   bx: 10,  days: 1,   color: '#a855f7' },
    premium:  { key: 'premium',  name: 'Purple Premium',  price: 8,  per: 'Month', bx: 50,  days: 30,  color: '#fbbf24' },
    overlord: { key: 'overlord', name: 'Overlord Purple', price: 16, per: 'Year',  bx: 150, days: 365, color: '#ef4444' }
  };

  /* ---------- tiny deterministic random (so the catalog is the same for everyone) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  /* ---------- sample players (their profiles can be opened) ---------- */
  const SEED_NAMES = ['ShadowRBLX', 'CoolDude123', 'LunaPlayz', 'RbxLegend', 'TradeMaster', 'PixelPirate', 'NeonNinja', 'CrystalFox', 'TurboTom', 'VoidWalker',
    'StarDust', 'BlazeRunner', 'FrostByte', 'MegaMango', 'GlitchQueen', 'IronOtter', 'SunnyDays', 'ZeroGravity', 'CosmicCat', 'RogueRaven',
    'AquaKnight', 'EmberEcho', 'QuietStorm', 'LuckyLemon', 'ByteBandit', 'MoonMuffin', 'DarkDragon99', 'PurplePanda', 'WaffleKing', 'SkyHopper'];
  const BIOS = ['Collecting rare drops since day one.', 'Here to trade, flip and have fun.', 'Ask me about my pets!', 'Speedrunner. Hat enthusiast.', 'Looking for Legendary swaps.',
    'Purple is the best colour. Fight me.', 'Just vibing in the marketplace.', 'Weapons dealer (the pixel kind).', 'I never say no to a good deal.', 'Building the biggest inventory on Bloxyfied.'];

  /* ---------- join dates for sample players ---------- */
  // Earliest = 16 Jan 2022, latest = Oct 2026 (capped at 25 Oct 2026). Change these two lines to move the range.
  const JOIN_MIN = new Date(2022, 0, 16).getTime(), JOIN_MAX = new Date(2026, 9, 25).getTime();
  // Some players have a fixed join date; everyone else gets a random (but stable) date inside the range.
  const FIXED_JOIN = {
    Bloxyfied: new Date(2022, 0, 16), RbxLegend: new Date(2022, 1, 3), TradeMaster: new Date(2022, 4, 20), ShadowRBLX: new Date(2022, 8, 9),
    VoidWalker: new Date(2023, 7, 11), DarkDragon99: new Date(2024, 3, 2), LunaPlayz: new Date(2025, 5, 30), CosmicCat: new Date(2026, 2, 14),
    NeonNinja: new Date(2026, 9, 20)
  };

  /* ---------- catalog: 3,650 items generated from word lists ---------- */
  const ADJ = ['Neon', 'Shadow', 'Crimson', 'Azure', 'Golden', 'Frost', 'Ember', 'Void', 'Cosmic', 'Royal', 'Rusty', 'Mystic', 'Turbo', 'Pixel', 'Lunar', 'Solar', 'Toxic', 'Velvet', 'Iron', 'Crystal',
    'Thunder', 'Jade', 'Obsidian', 'Sunset', 'Galaxy', 'Phantom', 'Savage', 'Glitch', 'Arctic', 'Blazing', 'Ancient', 'Electric', 'Emerald', 'Ruby', 'Silent', 'Wild', 'Retro', 'Chrome', 'Stealth', 'Candy'];
  const CATS = [
    { key: 'hat', cat: 'Hats', group: 'Roblox', count: 450, mult: 1, items: [['Crown', '👑'], ['Top Hat', '🎩'], ['Beanie', '🧢'], ['Helmet', '⛑️'], ['Cap', '🧢'], ['Fedora', '🎩'], ['Halo', '😇'], ['Horns', '😈'], ['Headband', '🎀'], ['Visor', '🥽'], ['Wizard Hat', '🧙'], ['Bandana', '🏴‍☠️'], ['Viking Helm', '🪖'], ['Cowboy Hat', '🤠']] },
    { key: 'clo', cat: 'Clothing', group: 'Roblox', count: 450, mult: 1, items: [['Hoodie', '🧥'], ['Jacket', '🧥'], ['Jeans', '👖'], ['Sneakers', '👟'], ['Scarf', '🧣'], ['Cape', '🦸'], ['Tee', '👕'], ['Joggers', '👖'], ['Boots', '🥾'], ['Vest', '🦺'], ['Kimono', '👘'], ['Gloves', '🧤'], ['Dress', '👗']] },
    { key: 'acc', cat: 'Accessories', group: 'Roblox', count: 400, mult: 1, items: [['Sunglasses', '🕶️'], ['Backpack', '🎒'], ['Necklace', '📿'], ['Watch', '⌚'], ['Headphones', '🎧'], ['Wings', '🦋'], ['Mask', '🎭'], ['Ring', '💍'], ['Belt', '🔗'], ['Tail', '🦊'], ['Lantern', '🏮'], ['Badge', '🏅']] },
    { key: 'gp', cat: 'Gamepasses', group: 'Roblox', count: 300, mult: 1.2, items: [['VIP Pass', '🎟️'], ['Double XP', '✨'], ['Speed Boost', '⚡'], ['Fly Mode', '🕊️'], ['Extra Lives', '❤️'], ['Pro Pack', '🎁'], ['Builder Kit', '🧱'], ['Lucky Charm', '🍀'], ['Backstage Pass', '🎫'], ['Jump Boost', '🦘'], ['Treasure Map', '🗺️'], ['Starter Bundle', '📦']] },
    { key: 'wep', cat: 'Weapons', group: 'In-Game', count: 450, mult: 1, items: [['Sword', '🗡️'], ['Bow', '🏹'], ['Axe', '🪓'], ['Trident', '🔱'], ['Shield', '🛡️'], ['Staff', '🪄'], ['Dagger', '🗡️'], ['Hammer', '🔨'], ['Spear', '🔱'], ['Blaster', '🔫'], ['Katana', '⚔️'], ['Scythe', '🌙'], ['Crossbow', '🏹'], ['Wand', '✨']] },
    { key: 'veh', cat: 'Vehicles', group: 'In-Game', count: 350, mult: 1.3, items: [['Racer', '🏎️'], ['Hoverboard', '🛹'], ['Rocket', '🚀'], ['Hot Rod', '🚗'], ['Motorbike', '🏍️'], ['Helicopter', '🚁'], ['Speedboat', '🚤'], ['Train', '🚂'], ['Buggy', '🛻'], ['Jet', '✈️'], ['UFO', '🛸'], ['Monster Truck', '🚙']] },
    { key: 'pet', cat: 'Pets', group: 'In-Game', count: 400, mult: 1.1, items: [['Dragon', '🐉'], ['Wolf', '🐺'], ['Fox', '🦊'], ['Cat', '🐱'], ['Puppy', '🐶'], ['Phoenix', '🔥'], ['Unicorn', '🦄'], ['Owl', '🦉'], ['Turtle', '🐢'], ['Bunny', '🐰'], ['Panda', '🐼'], ['Slime', '🟣'], ['Raven', '🐦']] },
    { key: 'fx', cat: 'Effects', group: 'In-Game', count: 300, mult: 0.9, items: [['Aura', '🌟'], ['Trail', '☄️'], ['Sparkle', '✨'], ['Flames', '🔥'], ['Lightning', '⚡'], ['Snowfall', '❄️'], ['Rainbow', '🌈'], ['Glow', '💫'], ['Shockwave', '🌊'], ['Fireworks', '🎆']] },
    { key: 'mer', cat: 'Merch', group: 'Bloxyfied Products', count: 300, mult: 0.6, items: [['Hoodie', '🧥'], ['T-Shirt', '👕'], ['Mug', '☕'], ['Sticker Pack', '🏷️'], ['Poster', '🖼️'], ['Cap', '🧢'], ['Phone Case', '📱'], ['Plushie', '🧸'], ['Keychain', '🔑'], ['Mousepad', '🖱️'], ['Tote Bag', '👜'], ['Notebook', '📓']] },
    { key: 'bun', cat: 'Bundles', group: 'Bloxyfied Products', count: 250, mult: 1.5, items: [['Starter Pack', '📦'], ['Pro Bundle', '🎁'], ['Mega Bundle', '🧰'], ['Collector Box', '🗃️'], ['Mystery Box', '❓'], ['Season Pass', '🎫'], ['Party Pack', '🎉'], ['Friends Pack', '👯'], ['Dragon Bundle', '🐉'], ['Racing Bundle', '🏁']] }
  ];
  const CATS_META = CATS.map(c => ({ cat: c.cat, group: c.group, icon: c.items[0][1] }));
  const GROUPS = ['Roblox', 'In-Game', 'Bloxyfied Products'];
  const TAGS = [['Common', 0.55, 20, 150], ['Rare', 0.79, 120, 500], ['Epic', 0.91, 400, 1200], ['Limited', 0.97, 700, 2200], ['Legendary', 1, 1800, 6000]];
  const round5 = n => Math.max(10, Math.round(n / 5) * 5);
  const CATALOG = [], BY_ID = {}, BY_SELLER = {};
  let NORMAL = []; // the everyday catalog (used for sample players' inventories)

  /* ---------- warnings + stock ---------- */
  const WARNS = {
    fraud: { cls: 'fraud', title: 'Possible FRAUD warning', text: 'This listing is priced far above normal market value and the seller cannot be verified. The item may not be delivered as described, and purchases are final. Only buy if you are completely sure.' },
    scam: { cls: 'scam', title: 'Possible SCAM warning', text: 'Listings like this are often used to trick buyers: fake rarity, "guaranteed profit" promises or requests to pay outside Bloxyfied. Never share your password or pay anyone off-site.' },
    dominus: { cls: 'dominus', title: 'EXTREME VALUE: Limited item', text: 'Dominus Of The Banned costs 50,000,000 BX and only a handful exist. It is flagged as extremely high risk and all purchases are final with no refunds. Make sure you really mean to spend this much.' }
  };
  const STOCK_RANGE = { Common: [60, 600], Rare: [25, 250], Epic: [10, 90], Limited: [3, 30], Legendary: [2, 15], Bloxyfied: [100, 999], Mythic: [1, 12] };
  const niceNum = n => { const m = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / m) * m; };
  const ELITE = ['Celestial', 'Eternal', 'Divine', 'Imperial', 'Apex', 'Omega', 'Sovereign', 'Titan', 'Primal', 'Radiant', 'Mythic', 'Infinite'];
  // 13 very expensive items that carry a fraud / scam warning
  const FLAGGED = [
    ['Violet Valkyrie Prime', 'Hats', 'Roblox', '🎩', 8500000, 'scam', 4], ['Infinity Fedora', 'Hats', 'Roblox', '🎩', 12000000, 'fraud', 2],
    ["Bloxy Founder's Crown", 'Hats', 'Roblox', '👑', 25000000, 'scam', 1], ['Galaxy Serpent', 'Pets', 'In-Game', '🐉', 4200000, 'fraud', 6],
    ['Phantom Racer GT', 'Vehicles', 'In-Game', '🏎️', 6750000, 'scam', 3], ['Eternal Flame Katana', 'Weapons', 'In-Game', '⚔️', 9900000, 'fraud', 2],
    ['Admin Backstage Pass', 'Gamepasses', 'Roblox', '🎫', 3000000, 'scam', 5], ['Unreleased Prototype Hoodie', 'Clothing', 'Roblox', '🧥', 2400000, 'fraud', 8],
    ['Double-Everything Gamepass', 'Gamepasses', 'Roblox', '✨', 5500000, 'scam', 7], ['Celestial Wings of Ruin', 'Accessories', 'Roblox', '🦋', 15000000, 'fraud', 2],
    ['Free Bx Generator Pack', 'Bundles', 'Bloxyfied Products', '🧰', 1500000, 'scam', 9], ['Verified Whale Bundle', 'Bundles', 'Bloxyfied Products', '🎁', 18500000, 'fraud', 3],
    ['Royal Sovereign Scepter', 'Weapons', 'In-Game', '🪄', 30000000, 'scam', 1]
  ];
  (function build() {
    const rng = mulberry32(20261025), all = [];
    CATS.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        const adj = ADJ[i % ADJ.length], [noun, icon] = c.items[Math.floor(i / ADJ.length) % c.items.length];
        const t = TAGS.find(x => rng() < x[1]) || TAGS[0];
        const merch = c.group === 'Bloxyfied Products';
        const price = round5((t[2] + (t[3] - t[2]) * Math.pow(rng(), 1.5)) * c.mult);
        all.push({ id: c.key + i, name: (merch ? 'BX ' : '') + adj + ' ' + noun, cat: c.cat, group: c.group, tag: merch ? 'Bloxyfied' : t[0], price, icon });
      }
    });
    for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [all[i], all[j]] = [all[j], all[i]]; }
    const base = [
      { id: 'c1', name: 'Purple Crown', cat: 'Hats', group: 'Roblox', tag: 'Limited', price: 1250, icon: '👑', seller: 'Bloxyfied' },
      { id: 'c2', name: 'Dark Blade', cat: 'Weapons', group: 'In-Game', tag: 'Rare', price: 850, icon: '🗡️', seller: 'Bloxyfied' },
      { id: 'c3', name: 'Red Valk', cat: 'Hats', group: 'Roblox', tag: 'Limited', price: 1800, icon: '🎩', seller: 'Bloxyfied' },
      { id: 'c4', name: 'Speedy Car', cat: 'Vehicles', group: 'In-Game', tag: 'In-Game', price: 1200, icon: '🚗', seller: 'Bloxyfied' },
      { id: 'c5', name: 'Classic Hoodie', cat: 'Merch', group: 'Bloxyfied Products', tag: 'Bloxyfied', price: 600, icon: '🧥', seller: 'Bloxyfied' }
    ];
    NORMAL = [...base, ...all];

    // LIMITED: Dominus Of The Banned, 50,000,000 Bx, with its own warning
    const dominus = { id: 'dominus', name: 'Dominus Of The Banned', cat: 'Hats', group: 'Roblox', tag: 'Limited', price: 50000000, icon: '😈', seller: 'VoidWalker', stock: 3, warn: 'dominus', hv: true };
    const flagged = FLAGGED.map((f, i) => ({ id: 'risk' + i, name: f[0], cat: f[1], group: f[2], tag: 'Mythic', price: f[4], icon: f[3], warn: f[5], stock: f[6], hv: true }));
    // lots of other expensive (but legitimate) items, 25,000 - 4,000,000 Bx
    const hvRng = mulberry32(777001), mythic = [];
    CATS.forEach((c, ci) => {
      const n = c.group === 'Bloxyfied Products' ? 8 : 12;
      for (let i = 0; i < n; i++) {
        const [noun, icon] = c.items[i % c.items.length];
        const price = niceNum(Math.exp(Math.log(25000) + hvRng() * (Math.log(4000000) - Math.log(25000))));
        mythic.push({ id: 'm' + c.key + i, name: ELITE[(i * 5 + ci) % ELITE.length] + ' ' + noun, cat: c.cat, group: c.group, tag: 'Mythic', price, icon, hv: true });
      }
    });

    [...base, dominus, ...flagged, ...mythic, ...all].forEach(it => {
      it.seller = it.seller || SEED_NAMES[hashStr(it.id) % SEED_NAMES.length];
      it.rap = Math.max(5, niceNum(it.price * (0.8 + (hashStr(it.id + 'rap') % 41) / 100))); // RAP = recent average price
      if (it.stock == null) { const r = STOCK_RANGE[it.tag] || [20, 200]; it.stock = r[0] + hashStr(it.id + 's') % (r[1] - r[0] + 1); }
      CATALOG.push(it); BY_ID[it.id] = it; (BY_SELLER[it.seller] = BY_SELLER[it.seller] || []).push(it);
    });
  })();

  /* ---------- store: things you buy with Bx ---------- */
  const STORE = [
    { id: 'col_pink', type: 'color', name: 'Neon Pink', price: 250, icon: '🌸', value: '#ff4fd8' },
    { id: 'col_cyan', type: 'color', name: 'Aqua Glow', price: 250, icon: '🌊', value: '#22d3ee' },
    { id: 'col_lime', type: 'color', name: 'Toxic Lime', price: 250, icon: '🍏', value: '#a3e635' },
    { id: 'col_red', type: 'color', name: 'Blaze Red', price: 250, icon: '🔥', value: '#f87171' },
    { id: 'col_violet', type: 'color', name: 'Royal Violet', price: 400, icon: '🔮', value: '#c084fc' },
    { id: 'col_gold', type: 'color', name: 'Pure Gold', price: 600, icon: '🏆', value: '#fbbf24' },
    { id: 'col_rainbow', type: 'color', name: 'Rainbow Flow', price: 1500, icon: '🌈', value: 'rainbow' },
    { id: 'ban_sunset', type: 'banner', name: 'Sunset Drive', price: 400, icon: '🌅', value: 'linear-gradient(120deg,#f97316,#db2777,#7c3aed)' },
    { id: 'ban_ocean', type: 'banner', name: 'Deep Ocean', price: 400, icon: '🌊', value: 'linear-gradient(120deg,#0ea5e9,#6366f1)' },
    { id: 'ban_forest', type: 'banner', name: 'Emerald Forest', price: 400, icon: '🌲', value: 'linear-gradient(120deg,#16a34a,#065f46)' },
    { id: 'ban_candy', type: 'banner', name: 'Candy Cloud', price: 500, icon: '🍬', value: 'linear-gradient(120deg,#f472b6,#a78bfa,#38bdf8)' },
    { id: 'ban_galaxy', type: 'banner', name: 'Galaxy', price: 900, icon: '🌌', value: 'radial-gradient(circle at 20% 30%,#7c3aed 0,transparent 45%),radial-gradient(circle at 80% 60%,#db2777 0,transparent 40%),#0b0626' },
    { id: 'ban_gold', type: 'banner', name: 'Golden Hour', price: 900, icon: '🌇', value: 'linear-gradient(120deg,#fbbf24,#b45309)' },
    { id: 'tit_trader', type: 'title', name: 'Trader', price: 200, icon: '🏷️', value: 'Trader' },
    { id: 'tit_collector', type: 'title', name: 'Collector', price: 300, icon: '🏷️', value: 'Collector' },
    { id: 'tit_speed', type: 'title', name: 'Speedrunner', price: 400, icon: '🏷️', value: 'Speedrunner' },
    { id: 'tit_royal', type: 'title', name: 'Purple Royalty', price: 1000, icon: '🏷️', value: 'Purple Royalty' },
    { id: 'tit_whale', type: 'title', name: 'Whale', price: 1500, icon: '🏷️', value: 'Whale' },
    { id: 'tit_legend', type: 'title', name: 'Legend', price: 2500, icon: '🏷️', value: 'Legend' },
    { id: 'crate_bronze', type: 'crate', name: 'Bronze Crate', price: 300, icon: '📦', value: { Common: 0.7, Rare: 0.25, Epic: 0.05 } },
    { id: 'crate_silver', type: 'crate', name: 'Silver Crate', price: 800, icon: '🎁', value: { Common: 0.3, Rare: 0.4, Epic: 0.2, Limited: 0.1 } },
    { id: 'crate_gold', type: 'crate', name: 'Gold Crate', price: 2000, icon: '💎', value: { Rare: 0.3, Epic: 0.35, Limited: 0.25, Legendary: 0.1 } },
    { id: 'xp_1', type: 'boost', name: 'XP Boost', price: 150, icon: '⚡', value: 500 },
    { id: 'xp_2', type: 'boost', name: 'Mega XP Boost', price: 600, icon: '🚀', value: 2500 },
    { id: 'xp_3', type: 'boost', name: 'Ultra XP Boost', price: 2000, icon: '🌠', value: 10000 }
  ];
  const STORE_BY_ID = Object.fromEntries(STORE.map(s => [s.id, s]));

  /* ---------- password hashing (salted SHA-256) ---------- */
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  const randSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function hashPw(pw, salt) {
    const data = new TextEncoder().encode(salt + ':' + pw);
    if (window.crypto && crypto.subtle) return hex(await crypto.subtle.digest('SHA-256', data));
    let h = 0; for (const c of salt + pw) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h;
  }

  /* ---------- online layer (talks to /api, see functions/api) ---------- */
  let serverUp = null;
  const token = () => localStorage.getItem(K.token);
  const OFFLINE_MSG = 'Online features are not available right now. Log in again once the server is connected (see README).';
  async function api(path, body, opts = {}) {
    let res;
    try {
      res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token() ? { authorization: 'Bearer ' + token() } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), keepalive: !!opts.keepalive
      });
    } catch { if (!opts.keepalive) serverUp = false; throw Object.assign(new Error('OFFLINE'), { offline: true }); }
    let data = null; try { data = await res.json(); } catch {}
    if (!data || res.status === 503) { serverUp = false; throw Object.assign(new Error('OFFLINE'), { offline: true }); }
    serverUp = true;
    if (!res.ok) {
      if (res.status === 401 && path !== '/api/login') localStorage.removeItem(K.token);
      throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status });
    }
    return data;
  }
  const snapshotOf = u => ({ bx: u.bx, xp: u.xp, bio: u.bio, inventory: u.inventory, cosm: u.cosm, sub: u.sub, trialUsed: u.trialUsed, createdAt: u.createdAt });
  let pushT = null;
  function schedulePush() { if (!token()) return; clearTimeout(pushT); pushT = setTimeout(() => pushNow(), 700); }
  async function pushNow(keep) {
    clearTimeout(pushT); pushT = null;
    const key = localStorage.getItem(K.session), u = key && read(K.users, {})[key];
    if (!u || !token()) return;
    try { await api('/api/push', { data: snapshotOf(u) }, { keepalive: !!keep }); } catch {}
  }
  window.addEventListener('pagehide', () => { if (pushT) pushNow(true); });

  /* ---------- accounts ---------- */
  const ensure = u => { u.cosm = u.cosm || { owned: [], equipped: {} }; u.cosm.owned = u.cosm.owned || []; u.cosm.equipped = u.cosm.equipped || {}; u.bio = u.bio || ''; u.inventory = u.inventory || []; return u; };
  async function register(username, password) {
    username = username.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Username must be 3-16 characters: letters, numbers or _');
    if (password.length < 6) throw new Error('Password must be at least 6 characters.');
    const users = read(K.users, {}); const key = username.toLowerCase();
    if (users[key] || key === 'bloxyfied' || SEED_NAMES.some(n => n.toLowerCase() === key)) throw new Error('That username is already taken.');
    const salt = randSalt();
    const u = ensure({ username, salt, hash: await hashPw(password, salt), bx: WELCOME_BX, xp: 0, sub: null, trialUsed: false, inventory: [], createdAt: Date.now() });
    let srv = null;
    try { srv = await api('/api/register', { username, password, snapshot: snapshotOf(u) }); } catch (e) { if (!e.offline) throw e; }
    users[key] = u; write(K.users, users); localStorage.setItem(K.session, key);
    if (srv) localStorage.setItem(K.token, srv.token); else localStorage.removeItem(K.token);
    return users[key];
  }
  async function login(username, password) {
    const users = read(K.users, {}); const key = username.trim().toLowerCase(); const u = users[key];
    let srv = null, offline = false;
    try { srv = await api('/api/login', { username: username.trim(), password }); }
    catch (e) {
      if (e.offline) offline = true;
      else if (e.message === 'no_user') {
        // account only exists on this device: upload it to the server so other devices and players can see it
        if (!u || (await hashPw(password, u.salt)) !== u.hash) throw new Error('Incorrect username or password.');
        try { const r = await api('/api/register', { username: u.username, password, snapshot: snapshotOf(ensure(u)) }); localStorage.setItem(K.token, r.token); } catch (e2) { localStorage.removeItem(K.token); }
        localStorage.setItem(K.session, key); return u;
      } else throw e;
    }
    if (offline) {
      if (!u || (await hashPw(password, u.salt)) !== u.hash) throw new Error('Incorrect username or password.');
      localStorage.removeItem(K.token); localStorage.setItem(K.session, key); return u;
    }
    // server accepted the password: the server copy of the account is the source of truth
    const salt = randSalt(), d = srv.data || {};
    users[key] = ensure({ username: srv.username, salt, hash: await hashPw(password, salt), bx: d.bx, xp: d.xp, bio: d.bio, inventory: d.inventory, cosm: d.cosm, sub: d.sub, trialUsed: d.trialUsed, createdAt: d.createdAt || Date.now(), seenEv: (u && u.seenEv) || [] });
    write(K.users, users); localStorage.setItem(K.token, srv.token); localStorage.setItem(K.session, key);
    return users[key];
  }
  function logout() { if (pushT) pushNow(true); localStorage.removeItem(K.session); localStorage.removeItem(K.token); location.href = 'index.html'; }

  function update(fn) {
    const key = localStorage.getItem(K.session); const users = read(K.users, {}); const u = users[key];
    if (!u) return null;
    ensure(u); const before = JSON.stringify(snapshotOf(u)); fn(u); users[key] = u; write(K.users, users);
    if (JSON.stringify(snapshotOf(u)) !== before) schedulePush();
    return u;
  }
  const activePlan = u => (u && u.sub && Date.now() < u.sub.start + u.sub.days * DAY) ? PLANS[u.sub.plan] : null;
  function accrue() {
    return update(u => {
      if (!u.sub) return;
      const p = PLANS[u.sub.plan];
      const entitled = Math.min(u.sub.days, Math.floor((Date.now() - u.sub.start) / DAY) + 1);
      const owed = entitled - u.sub.claimed;
      if (owed > 0) { u.bx += owed * p.bx; u.sub.claimed = entitled; }
    });
  }
  function current() { return localStorage.getItem(K.session) ? accrue() : null; }
  function requireAuth() {
    const u = current();
    if (!u) { location.href = 'index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'); return null; }
    return u;
  }
  const ownedIds = () => { const k = localStorage.getItem(K.session); const u = k && read(K.users, {})[k]; return new Set(u ? (u.inventory || []).map(x => x.id) : []); };

  /* ---------- Bx / subscriptions / marketplace ---------- */
  const addBx = amount => update(u => { u.bx += amount; });
  function subscribe(planKey, trial = false) {
    update(u => {
      if (trial && u.trialUsed) throw new Error('Free trial already used on this account.');
      if (trial) u.trialUsed = true;
      u.sub = { plan: planKey, start: Date.now(), days: trial ? 3 : PLANS[planKey].days, claimed: 0, trial };
    });
    return accrue();
  }
  const listings = () => read(K.listings, []).map(l => ({ group: l.group || l.cat, ...l }));
  const sales = () => read(K.sales, []);
  function addSale(item) { const s = sales(); s.unshift({ name: item.name, price: item.price, icon: item.icon, at: Date.now() }); write(K.sales, s.slice(0, 40)); }
  const findItem = id => BY_ID[id] || listings().find(l => l.id === id) || null;
  const soldOf = id => (read(K.stock, {})[id] || 0);
  const stockLeft = i => i.stock == null ? Infinity : Math.max(0, i.stock - soldOf(i.id));
  const rapOf = i => { const b = i && BY_ID[i.id]; return (b && b.rap) || (i && i.rap) || (i ? i.price : 0); };
  const warnOf = i => (i && WARNS[i.warn]) || null;
  const stockHtml = i => {
    const n = stockLeft(i); if (n === Infinity) return '';
    return n <= 0 ? '<div class="stk out">Sold out</div>' : `<div class="stk ${n <= 5 ? 'low' : ''}">📦 ${n <= 5 ? 'Only ' + n + ' left' : 'Stock: ' + fmt(n)}</div>`;
  };
  function buyItem(item) {
    const meKey = localStorage.getItem(K.session);
    if (item.seller && meKey && item.seller.toLowerCase() === meKey) throw new Error('You cannot buy your own listing.');
    update(u => {
      if (u.inventory.some(x => x.id === item.id)) throw new Error('You already own this item.');
      if (stockLeft(item) <= 0) throw new Error('This item is sold out.');
      if (u.bx < item.price) throw new Error('NOT_ENOUGH');
      u.bx -= item.price; u.xp += Math.max(1, Math.round(item.price / 10));
      u.inventory.push({ id: item.id, name: item.name, icon: item.icon, price: item.price, at: Date.now() });
      const st = read(K.stock, {}); st[item.id] = (st[item.id] || 0) + 1; write(K.stock, st);
    });
    const sk = item.seller && item.seller.toLowerCase(); const users = read(K.users, {});
    if (sk && users[sk]) { users[sk].bx += item.price; write(K.users, users); } // real seller gets paid
    addSale(item);
  }
  function addListing(l) {
    const me = current(); const meta = CATS.find(c => c.cat === l.cat) || CATS[0]; const all = listings();
    all.unshift({ id: 'u' + Date.now(), name: l.name, cat: meta.cat, group: meta.group, tag: 'User', price: l.price, icon: meta.items[0][1], seller: me.username, stock: Math.max(1, Math.min(999, Math.floor(l.stock) || 1)) });
    write(K.listings, all);
  }

  /* ---------- store ---------- */
  function rollCrate(weights, own) {
    let r = Math.random(), tag = 'Common';
    for (const [t, w] of Object.entries(weights)) { tag = t; if (r < w) break; r -= w; }
    let pool = CATALOG.filter(i => i.tag === tag && !i.hv && !own.has(i.id));
    if (!pool.length) pool = CATALOG.filter(i => !i.hv && !own.has(i.id));
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }
  function buyStore(id) {
    const s = STORE_BY_ID[id]; if (!s) throw new Error('Unknown item.');
    const result = {};
    update(u => {
      if (u.bx < s.price) throw new Error('NOT_ENOUGH');
      if (['color', 'banner', 'title'].includes(s.type) && u.cosm.owned.includes(s.id)) throw new Error('You already own this.');
      if (s.type === 'crate') {
        const it = rollCrate(s.value, new Set(u.inventory.map(x => x.id)));
        if (!it) throw new Error('You already own every item!');
        u.inventory.push({ id: it.id, name: it.name, icon: it.icon, price: it.price, at: Date.now() }); result.item = it;
      } else if (s.type === 'boost') u.xp += s.value;
      else u.cosm.owned.push(s.id);
      u.bx -= s.price; u.xp += Math.round(s.price / 20);
    });
    return result;
  }
  function equip(slot, id) {
    update(u => { if (id && !u.cosm.owned.includes(id)) throw new Error('You do not own that.'); u.cosm.equipped[slot] = id || null; });
  }
  const setBio = text => update(u => { u.bio = String(text).slice(0, 140); });

  /* ---------- profiles ---------- */
  const resolveEq = eq => ({ color: STORE_BY_ID[eq.color] || null, banner: STORE_BY_ID[eq.banner] || null, title: STORE_BY_ID[eq.title] || null });
  const hydrate = x => BY_ID[x.id] || listings().find(l => l.id === x.id) || { tag: 'Common', cat: 'Item', group: 'Roblox', seller: 'Bloxyfied', ...x, icon: esc(x.icon || '🎁') };
  const iconOf = i => (BY_ID[i.id] && BY_ID[i.id].icon) || esc(i.icon || '🎁');
  const SEED_CACHE = {};
  function seedProfile(name) {
    const low = name.toLowerCase(), official = low === 'bloxyfied';
    const nm = official ? 'Bloxyfied' : SEED_NAMES.find(n => n.toLowerCase() === low);
    if (!nm) return null;
    if (SEED_CACHE[nm]) return SEED_CACHE[nm];
    const rng = mulberry32(hashStr(nm));
    const xp = official ? 99000 : Math.floor(rng() * 60000);
    const r = rng(), plan = official ? PLANS.overlord : r < 0.35 ? null : r < 0.6 ? PLANS.basic : r < 0.85 ? PLANS.premium : PLANS.overlord;
    const inv = new Set(), want = 6 + Math.floor(rng() * 18);
    while (inv.size < want) inv.add(NORMAL[Math.floor(rng() * NORMAL.length)]);
    const pick = type => { const list = STORE.filter(s => s.type === type); return rng() < 0.65 ? list[Math.floor(rng() * list.length)] : null; };
    const p = {
      username: nm, seed: true, own: false, level: level(xp), xp,
      joined: FIXED_JOIN[nm] ? FIXED_JOIN[nm].getTime() : Math.round(JOIN_MIN + mulberry32(hashStr(nm + 'join'))() * (JOIN_MAX - JOIN_MIN)),
      persona: official ? 'official' : ['friendly', 'trader', 'chill', 'sassy'][hashStr(nm + 'persona') % 4],
      bio: official ? 'The official Bloxyfied account. Welcome to the marketplace!' : BIOS[Math.floor(rng() * BIOS.length)],
      plan, inventory: [...inv], listings: BY_SELLER[nm] || [],
      equipped: { color: pick('color'), banner: pick('banner'), title: pick('title') },
      bx: null, online: rng() < 0.5
    };
    return (SEED_CACHE[nm] = p);
  }
  function profile(name) {
    const key = String(name).toLowerCase(), users = read(K.users, {}), u = users[key];
    if (u) {
      ensure(u); const mine = key === localStorage.getItem(K.session);
      return {
        username: u.username, seed: false, own: mine, level: level(u.xp), xp: u.xp, joined: u.createdAt, bio: u.bio, plan: activePlan(u),
        inventory: u.inventory.map(hydrate), listings: listings().filter(l => l.seller.toLowerCase() === key),
        equipped: resolveEq(u.cosm.equipped), cosm: u.cosm, bx: mine ? u.bx : null, online: mine
      };
    }
    if (REMOTE[key]) return remoteProfile(REMOTE[key]);
    return seedProfile(name);
  }
  const REMOTE = read(K.remote, {});
  function remoteProfile(r) {
    return {
      username: r.username, seed: false, remote: true, own: false, level: level(r.xp), xp: r.xp, joined: r.createdAt, bio: r.bio || '', plan: (r.plan && PLANS[r.plan]) || null,
      inventory: (r.inventory || []).map(hydrate), listings: [], equipped: resolveEq((r.cosm && r.cosm.equipped) || {}), cosm: r.cosm, bx: null, online: !!r.online
    };
  }
  async function fetchProfile(name) {
    const r = await api('/api/profile?u=' + encodeURIComponent(name));
    REMOTE[String(name).toLowerCase()] = r; write(K.remote, REMOTE);
    return profile(name);
  }
  let REAL = read(K.players, []);
  async function refreshPlayers() { try { REAL = (await api('/api/players')).players; write(K.players, REAL); } catch {} return REAL; }
  const realOnline = () => { const me = localStorage.getItem(K.session); return REAL.filter(p => p.online && p.u.toLowerCase() !== me); };
  const allPlayers = () => [...new Set([...Object.values(read(K.users, {})).map(u => u.username), ...REAL.map(p => p.u), 'Bloxyfied', ...SEED_NAMES])];
  const randomPlayers = n => { const a = SEED_NAMES.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const avatarStyle = n => { const h = hashStr(String(n).toLowerCase()) % 360; return `background:linear-gradient(135deg,hsl(${h} 75% 58%),hsl(${(h + 50) % 360} 70% 32%))`; };
  const badgeHtml = plan => plan ? `<span class="vbadge" style="--c:${plan.color}" title="${esc(plan.name)}">✓</span>` : '';
  function nameHtml(p) {
    const c = p.equipped && p.equipped.color; let cls = 'uname', st = '';
    if (c) { if (c.value === 'rainbow') cls += ' rainbow'; else st = ` style="color:${c.value}"`; }
    return `<span class="${cls}"${st}>${esc(p.username)}</span>${badgeHtml(p.plan)}`;
  }
  const nameOf = name => { const p = profile(name); return p ? nameHtml(p) : esc(name); };
  const profileUrl = name => 'profile.html?u=' + encodeURIComponent(name);
  const sellerLink = name => `<a class="slink" href="${profileUrl(name || 'Bloxyfied')}">${esc(name || 'Bloxyfied')}</a>`;


  /* ---------- chat with sample players (rule-based replies, no server needed) ---------- */
  const fmtDate = t => new Date(t).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  function sinceText(t) {
    const d = Math.max(0, Math.floor((Date.now() - t) / DAY)), y = Math.floor(d / 365), mo = Math.floor((d % 365) / 30);
    if (y >= 1) return y + (y === 1 ? ' year' : ' years') + (mo ? ' and ' + mo + (mo === 1 ? ' month' : ' months') : '');
    if (mo >= 1) return mo + (mo === 1 ? ' month' : ' months');
    return d <= 1 ? 'a day' : d + ' days';
  }
  const STOP = new Set('this that with have what your about from they them then there their would could should just like really very much more some when where which while will been were does dont cant want need know tell give make take going think thing things hello please thanks thank'.split(' '));
  function chatReply(p, text, me, turn) {
    const t = String(text).toLowerCase().replace(/\s+/g, ' ').trim(), seed = hashStr(t + p.username) + (turn || 0) * 7919;
    const pk = arr => arr[seed % arr.length];
    const has = (...w) => w.some(x => x instanceof RegExp ? x.test(t) : t.includes(x));
    const per = p.persona || 'friendly', name = p.username;
    const inv = p.inventory.slice().sort((a, b) => b.price - a.price), top = inv[0], second = inv[1], sale = p.listings[0];
    const TAIL = { friendly: [' 😊', ' 🙂', '!'], trader: [' 💰', ' 📈', ''], chill: [' ✌️', ' 😎', ''], sassy: [' 😏', ' 💅', ''], official: [' 💜', '', ''] }[per];
    const LEAD = {
      friendly: ['Sure!', 'Of course!', 'Happy to help!'], trader: ['Alright, business:', "Let's talk numbers.", 'Straight answer:'],
      chill: ['Yeah,', 'Honestly,', 'So like,'], sassy: ['Oh, you want to know?', 'Well, well,', 'Fine, I will tell you:'], official: ['Hello from the Bloxyfied team!', 'Great question!', 'Glad you asked!']
    }[per];
    const out = (body, lead = true) => (lead ? pk(LEAD) + ' ' : '') + body + pk(TAIL);
    const itemTxt = i => `${i.name} (${fmt(i.price)} BX)`;

    if (!t) return out('Say something and I will answer!', false);
    if (has(/\b(hi|hey|hello|yo|sup|hiya|howdy)\b/, 'good morning', 'good evening', 'good afternoon', "what's up", 'whats up'))
      return out(pk([`Hey ${me}! I'm ${name}. ${p.online ? "I'm online right now, so ask away." : 'I just stepped back to the keyboard.'}`, `Hi ${me}! Welcome to my profile.`, `Yo ${me}, what's going on?`]), false);
    if (has('how are you', 'how r u', 'how are u', 'hows it going', "how's it going", 'how you doing'))
      return out(pk([`I'm doing great, level ${p.level} and still climbing. How about you?`, `Not bad at all! Been busy on the marketplace. You?`, `Can't complain. Level ${p.level} and loving it.`]), false);
    if (has('scam', 'fraud', 'legit', 'trust', 'safe', 'fake', 'rip off', 'ripoff'))
      return out(pk(['If a price looks absurd or a seller pushes you to pay off-site, walk away. Bloxyfied shows a warning on risky listings, so read it before you buy.', "Never share your password and never pay outside Bloxyfied. Anything with a scam or fraud warning, I'd think twice about.", 'Rule of thumb: if it sounds too good to be true, it is. Check the warning box on the item before buying.']));
    if (has('dominus', 'banned', '50 million', '50m', '50,000,000'))
      return out(pk(['Dominus Of The Banned costs 50,000,000 BX and only 3 exist. It even throws a big warning when you try to buy it. That is a lot of Bx!', "Dominus Of The Banned is the priciest Limited on the market, 50,000,000 BX. I'm not touching it, but I'd love to see who does."]));
    if (has('million', 'expensive', 'priciest', 'most valuable', 'highest price', 'rich', 'whale'))
      return out(top ? `The priciest thing I own is ${itemTxt(top)}. The really crazy prices are in the High Value filter on the home page.` : 'I am still building my collection. Check the High Value filter on the home page for the crazy prices.');
    if (has('join', 'member since', 'how long', 'when did you', 'new here', 'old account', 'veteran', 'been here'))
      return out(pk([`I joined on ${fmtDate(p.joined)}, so about ${sinceText(p.joined)} ago.`, `Member since ${fmtDate(p.joined)}. That is ${sinceText(p.joined)} on Bloxyfied.`]));
    if (has('level', ' xp', 'exp ', 'experience'))
      return out(`I'm level ${p.level} with ${fmt(p.xp)} XP in total.`);
    if (has('who are you', 'your name', 'ur name', 'who r u', 'introduce'))
      return out(`I'm ${name}. ${p.bio} Level ${p.level}, member since ${fmtDate(p.joined)}.`, false);
    if (has('bio', 'about you', 'about yourself', 'what do you do', 'hobby', 'hobbies', 'tell me about'))
      return out(`${p.bio} I own ${p.inventory.length} items and I'm level ${p.level}.`);
    if (has('inventory', 'collection', 'what do you have', 'what do you own', 'your items', 'rare', 'favorite item', 'favourite item'))
      return out(top ? `I own ${p.inventory.length} items. My best are ${itemTxt(top)}${second ? ' and ' + itemTxt(second) : ''}.` : "My inventory is empty right now, I'm just getting started.");
    if (has('selling', 'for sale', 'on sale', 'listing', 'listed', 'sell me', 'can i buy', 'buy from you'))
      return out(sale ? `I have ${sale.name} listed for ${fmt(sale.price)} BX${sale.stock != null ? ' (' + sale.stock + ' in stock)' : ''}. You can find it under "On sale" on my profile.` : "I don't have anything listed right now, but check back soon.");
    if (has('trade', 'swap', 'exchange', 'offer'))
      return out(pk(['Player-to-player trading is not live yet (the Trading tab says coming soon). For now you can buy what I list on the marketplace.', "Trading isn't open yet. Once it is, I'm happy to talk swaps."]));
    if (has('price', 'how much', 'cost', 'cheap', 'discount', 'deal', 'bargain', 'lower', 'haggle'))
      return out(sale ? `${sale.name} is ${fmt(sale.price)} BX. Prices are set by the marketplace, so I can't lower it, but it is a fair price.` : pk(['Prices depend on rarity. Common items are cheap, Mythic ones cost hundreds of thousands or millions.', 'Sort the marketplace by price to hunt for deals.']));
    if (has('bx', 'currency', 'coins', 'money', 'balance'))
      return out(pk(['You can top up Bx in the Shop under Buy Currency. It is instant.', 'Subscriptions give you Bx every day, which is the easiest way to stack up.']));
    if (has('premium', 'subscri', 'purple', 'badge', 'overlord', 'check mark', 'checkmark'))
      return out(p.plan ? `I'm on ${p.plan.name}, which gives me daily Bx and a badge next to my name. Worth it!` : "I'm not subscribed right now, but the Purple plans look good for daily Bx.");
    if (has('stock', 'sold out', 'in stock', 'how many left', 'limited'))
      return out('Stock is shown on every card. Limited and Mythic items can drop to 1 or 2 left, so grab them fast.');
    if (has('game', 'roblox', 'play', 'server'))
      return out(pk(['I play a bit of everything, but the marketplace is my main game.', 'Mostly trading and collecting lately. What do you play?']));
    if (has('thank', 'thx', 'ty ', 'appreciate'))
      return out(pk(["No problem at all!", "Anytime!", "You're welcome!"]), false);
    if (has('bye', 'cya', 'see you', 'gotta go', 'goodnight', 'gn', 'later'))
      return out(pk(['See you around!', 'Bye! Come chat again soon.', 'Later! Happy trading.']), false);
    if (has('sorry', 'my bad', 'oops'))
      return out('All good, no worries.', false);
    if (has('cool', 'nice', 'awesome', 'amazing', 'great', 'love', 'good job', 'epic', 'wow', 'respect'))
      return out(pk(['Thanks, that means a lot!', 'Appreciate it!', 'Haha thanks, you are too kind.']), false);
    if (has('stupid', 'idiot', 'trash', 'noob', 'hate', 'ugly', 'dumb', 'suck'))
      return out(pk(per === 'sassy' ? ['Wow. Bold for someone with a worse inventory.', 'Cute. Try again with some manners.'] : ['Hey, let us keep it friendly.', "That's not very nice. Let's keep it chill."]), false);
    if (has('help', 'how do i', 'how to', 'support', 'problem', 'bug'))
      return out(pk(['Browse the marketplace on Home, hit Buy, and the item lands in your inventory. Need more Bx? Visit the Shop.', 'Search for items or users in the top bar. Click any item to see its stock and details.']));
    if (has(/\b(lol|lmao|haha|hehe|xd)\b/))
      return out(pk(['Haha right?', 'lol fair', 'Ha! Good one.']), false);
    if (has(/^(yes|yeah|yep|sure|ok|okay|k|no|nope|nah)\W*$/))
      return out(pk(['Alright then. Anything else you want to know?', 'Got it. What else is on your mind?']), false);
    const kw = t.replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(w => w.length > 3 && !STOP.has(w)).sort((a, b) => b.length - a.length)[0];
    if (kw && /\?/.test(t)) return out(pk([`Hmm, "${kw}"? Good question. I'm not sure, but I'd check the marketplace for it.`, `I haven't thought much about ${kw}. What made you ask?`, `Honestly I don't know much about ${kw}. Do you?`]));
    if (kw) return out(pk([`Interesting, tell me more about ${kw}.`, `${kw[0].toUpperCase() + kw.slice(1)}, huh? I'd like to hear more.`, `Ha, ${kw}. Not what I expected, but go on.`]), false);
    return out(pk(['Tell me more!', 'Hmm, go on.', "I'm listening."]), false);
  }
  const chatKey = (me, them) => me.toLowerCase() + '|' + them.toLowerCase();
  const chatHistory = (me, them) => (read(K.chat, {})[chatKey(me, them)] || []);
  function chatPush(me, them, from, text) {
    const all = read(K.chat, {}), k = chatKey(me, them); const h = all[k] || [];
    h.push({ f: from, t: text, at: Date.now() }); all[k] = h.slice(-60); write(K.chat, all);
  }
  function chatSend(me, them, text) {
    const p = profile(them); if (!p || !p.seed) throw new Error('This player is not available to chat.');
    text = String(text).trim().slice(0, 300); if (!text) throw new Error('Type a message first.');
    const turn = chatHistory(me, them).filter(m => m.f === 'me').length;
    chatPush(me, them, 'me', text);
    return chatReply(p, text, me, turn);
  }
  const chatClear = (me, them) => { const all = read(K.chat, {}); delete all[chatKey(me, them)]; write(K.chat, all); };

  /* ---------- UI helpers ---------- */
  function toast(msg, type = '') {
    let box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; box.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }
  function modal(html, cls = '') {
    const bg = document.createElement('div'); bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal ' + cls + '">' + html + '</div>';
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    return { el: bg.firstChild, close };
  }
  const badge = u => badgeHtml(activePlan(u));
  const ago = t => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? m + 'm ago' : Math.round(m / 60) + 'h ago'; };

  /* item card + buy flow shared by Home and Profile */
  function card(i, own, opts = {}) {
    const has = own && own.has(i.id);
    const w = warnOf(i), left = stockLeft(i);
    const action = opts.view ? '' : has ? '<button class="btn outline block sm" disabled>✔ Owned</button>' : left <= 0 ? '<button class="btn outline block sm" disabled>Sold out</button>' : `<button class="btn primary block sm" data-buy="${esc(i.id)}">${w ? '⚠️ Buy' : 'Buy'}</button>`;
    return `<div class="item ${w ? 'risky' : ''}" data-open="${esc(i.id)}"><div class="pic">${i.icon}</div><span class="chip ${esc(i.tag)}">${esc(i.tag)}</span>${w ? `<span class="riskchip ${w.cls}">⚠️ ${w.cls === 'dominus' ? 'High risk' : w.cls === 'fraud' ? 'Fraud?' : 'Scam?'}</span>` : ''}
      <div class="nm">${esc(i.name)}</div><div class="ct">${esc(i.cat)} · by ${sellerLink(i.seller)}</div>
      <div class="pr"><span class="bxcoin">BX</span>${fmt(i.price)} BX</div><div class="rap">RAP ${fmt(rapOf(i))}</div>${opts.view ? '' : stockHtml(i)}${action}</div>`;
  }
  function handleBuy(id, done) {
    const item = findItem(id); if (!item) return;
    if (!localStorage.getItem(K.session)) {
      toast('Log in to buy items.', 'bad');
      setTimeout(() => location.href = 'index.html?next=' + encodeURIComponent(location.pathname.split('/').pop() || 'home.html'), 900); return;
    }
    const go = () => {
      try { buyItem(item); toast('Purchased ' + item.name + ' for ' + fmt(item.price) + ' BX!', 'ok'); if (done) done(); }
      catch (err) {
        if (err.message === 'NOT_ENOUGH') { toast('Not enough BX. Taking you to the shop...', 'bad'); setTimeout(() => location.href = 'shop.html', 1200); }
        else toast(err.message, 'bad');
      }
    };
    const w = warnOf(item);
    if (!w) return go();
    const m = modal(`<div class="warnbox ${w.cls}"><div class="wicon">⚠️</div><div><h3>${esc(w.title)}</h3><b>${esc(item.name)} · ${fmt(item.price)} BX</b></div></div>
      <p>${esc(w.text)}</p>
      <div class="row"><button class="btn outline" id="wNo">Cancel</button><button class="btn danger" id="wGo">I understand, buy anyway</button></div>`);
    m.el.querySelector('#wNo').onclick = m.close;
    m.el.querySelector('#wGo').onclick = () => { m.close(); go(); };
  }
  function showItem(id, onChange) {
    const it = findItem(id); if (!it) return;
    const own = ownedIds().has(it.id), left = stockLeft(it), w = warnOf(it);
    const m = modal(`<div class="bigicon">${it.icon}</div><h3 style="text-align:center">${esc(it.name)}</h3>
      <div style="text-align:center;margin-bottom:12px"><span class="chip inl ${esc(it.tag)}">${esc(it.tag)}</span></div>
      <div class="list-line"><span>Category</span><b>${esc(it.cat)}</b></div>
      <div class="list-line"><span>Section</span><b>${esc(it.group)}</b></div>
      <div class="list-line"><span>Seller</span><b>${sellerLink(it.seller)}</b></div>
      <div class="list-line"><span>Price</span><b>${fmt(it.price)} BX</b></div>
      <div class="list-line"><span>RAP (recent average price)</span><b>${fmt(rapOf(it))} BX</b></div>
      ${left === Infinity ? '' : `<div class="list-line"><span>Stock</span><b>${left <= 0 ? 'Sold out' : fmt(left) + ' of ' + fmt(it.stock) + ' left'}</b></div>`}
      ${w ? `<div class="warnbox ${w.cls}" style="margin-top:12px"><div class="wicon">⚠️</div><div><h3>${esc(w.title)}</h3><small>${esc(w.text)}</small></div></div>` : ''}
      <div class="row"><button class="btn outline" id="xClose">Close</button>${own ? '<button class="btn outline" disabled>✔ Owned</button>' : left <= 0 ? '<button class="btn outline" disabled>Sold out</button>' : '<button class="btn primary" id="xBuy">' + (w ? '⚠️ ' : '') + 'Buy for ' + fmt(it.price) + ' BX</button>'}</div>`);
    m.el.querySelector('#xClose').onclick = m.close;
    const b = m.el.querySelector('#xBuy');
    if (b) b.onclick = () => handleBuy(it.id, () => { m.close(); if (onChange) onChange(); });
  }
  function bindItems(root, onChange) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-buy]');
      if (b) { e.stopPropagation(); handleBuy(b.dataset.buy, onChange); return; }
      if (e.target.closest('a')) return;
      const c = e.target.closest('[data-open]'); if (c) showItem(c.dataset.open, onChange);
    });
  }


  /* ---------- sync loop, messages and trades ---------- */
  const SOCIAL = { unread: 0, incoming: 0 };
  let syncTimer = null, lastU = -1, lastI = -1, syncN = 0;
  function paintBadges() {
    document.querySelectorAll('[data-badge]').forEach(el => { const n = el.dataset.badge === 'msg' ? SOCIAL.unread : SOCIAL.incoming; el.textContent = n > 9 ? '9+' : n; el.style.display = n ? '' : 'none'; });
  }
  function applyEvents(evs) {
    const ids = [];
    evs.forEach(ev => {
      ids.push(ev.id);
      if (ev.type === 'note') toast(ev.text);
      else if (ev.type === 'trade') {
        let applied = false;
        update(u => {
          u.seenEv = u.seenEv || []; if (u.seenEv.includes(ev.id)) return;
          u.seenEv.push(ev.id); u.seenEv = u.seenEv.slice(-100);
          const g = new Set(ev.give); u.inventory = u.inventory.filter(x => !g.has(x.id));
          ev.get.forEach(it => { if (!u.inventory.some(x => x.id === it.id)) u.inventory.push({ id: it.id, name: it.name, icon: it.icon, price: it.price, at: Date.now() }); });
          applied = true;
        });
        if (applied) toast('🔁 Trade with ' + ev.with + ' completed!', 'ok');
      }
    });
    return ids;
  }
  async function syncOnce() {
    if (!token()) return null;
    const r = await api('/api/sync');
    if (r.events.length) { const ids = applyEvents(r.events); api('/api/ack', { ids }).catch(() => {}); }
    if (r.unread > lastU && r.unread > 0) toast('💬 You have ' + r.unread + ' unread message' + (r.unread > 1 ? 's' : ''));
    if (r.incoming > lastI && r.incoming > 0) toast('🔁 You have ' + r.incoming + ' trade request' + (r.incoming > 1 ? 's' : ''));
    lastU = r.unread; lastI = r.incoming; SOCIAL.unread = r.unread; SOCIAL.incoming = r.incoming; paintBadges();
    document.dispatchEvent(new CustomEvent('bx:sync', { detail: r }));
    return r;
  }
  function startSync() {
    paintBadges(); if (!token() || syncTimer) return;
    const tick = async () => { try { await syncOnce(); if (syncN++ % 4 === 0) await refreshPlayers(); } catch (e) { /* offline or logged out */ } };
    tick(); syncTimer = setInterval(tick, 6000);
  }
  function needOnline() {
    if (!localStorage.getItem(K.session)) { toast('Log in first.', 'bad'); return false; }
    if (!token()) { toast(OFFLINE_MSG, 'bad'); return false; }
    return true;
  }
  const timeStr = t => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const rapSum = list => list.reduce((a, i) => a + rapOf(i), 0);

  function openMessages(withName) {
    if (!needOnline()) return;
    const m = modal('<div id="mm"></div>', 'wide'), root = m.el.querySelector('#mm'); let timer = null;
    const stop = () => { clearInterval(timer); timer = null; };
    const gone = () => !document.body.contains(root);
    const closeAll = () => { stop(); m.close(); };
    async function showList() {
      stop();
      root.innerHTML = `<h3>💬 Messages</h3><div class="mnew"><input class="field" id="mTo" maxlength="16" placeholder="Message a player (type a username)..."><button class="btn primary" id="mGo">Open</button></div>
        <div class="mlist" id="mList"><p class="muted">Loading...</p></div><div class="row"><button class="btn primary" id="mClose">Close</button></div>`;
      root.querySelector('#mClose').onclick = closeAll;
      const go = () => { const n = root.querySelector('#mTo').value.trim(); if (n) showThread(n); };
      root.querySelector('#mGo').onclick = go; root.querySelector('#mTo').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      const load = async () => {
        if (gone()) return stop();
        try {
          const r = await api('/api/inbox'), box = root.querySelector('#mList'); if (!box) return;
          box.innerHTML = r.conversations.length ? r.conversations.map(c => `<button class="mrow" data-w="${esc(c.with)}"><span class="avatar sm" style="${avatarStyle(c.with)}">${esc(c.with[0].toUpperCase())}</span>
            <span class="mtxt"><b>${esc(c.with)}</b> ${c.online ? '<span class="dot on"></span>' : ''}<small>${c.mine ? 'You: ' : ''}${esc(c.text)}</small></span>${c.unread ? `<span class="nbadge">${c.unread}</span>` : ''}</button>`).join('')
            : '<p class="muted empty">No conversations yet. Type a username above to start one, or press Message on a player\'s profile.</p>';
        } catch (e) { const box = root.querySelector('#mList'); if (box) box.innerHTML = '<p class="muted empty">' + esc(e.offline ? OFFLINE_MSG : e.message) + '</p>'; }
      };
      root.querySelector('#mList').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) showThread(b.dataset.w); });
      await load(); timer = setInterval(load, 5000);
    }
    async function showThread(name) {
      stop(); let lastId = 0;
      root.innerHTML = `<div class="mhead"><button class="btn outline sm" id="mBack">←</button><b>${nameOf(name)}</b><a class="slink" href="${profileUrl(name)}">View profile</a></div>
        <div class="cmsgs" id="mMsgs"><div class="cempty">Loading...</div></div>
        <div class="cform"><input class="field" id="mIn" maxlength="300" placeholder="Message ${esc(name)}..." autocomplete="off"><button class="btn primary" id="mSend">Send</button></div>
        <div class="row"><button class="btn outline" id="mClose">Close</button></div>`;
      root.querySelector('#mClose').onclick = closeAll; root.querySelector('#mBack').onclick = showList;
      const box = root.querySelector('#mMsgs');
      const add = list => {
        const e = box.querySelector('.cempty'); if (e) e.remove();
        list.forEach(x => { box.insertAdjacentHTML('beforeend', `<div class="cmsg ${x.mine ? 'me' : 'them'}">${esc(x.text)}<small>${timeStr(x.at)}</small></div>`); lastId = Math.max(lastId, x.id); });
        box.scrollTop = box.scrollHeight;
      };
      const poll = async () => {
        if (gone()) return stop();
        try { const r = await api('/api/messages?with=' + encodeURIComponent(name) + '&after=' + lastId); if (r.messages.length) add(r.messages); else if (!lastId && !box.querySelector('.cmsg')) box.innerHTML = `<div class="cempty">No messages yet. Say hi to ${esc(name)}!</div>`; }
        catch (e) { if (e.offline) stop(); }
      };
      const send = async () => {
        const inp = root.querySelector('#mIn'), text = inp.value.trim(); if (!text) return;
        try { await api('/api/messages', { to: name, text }); inp.value = ''; await poll(); } catch (e) { toast(e.offline ? OFFLINE_MSG : e.message, 'bad'); }
      };
      root.querySelector('#mSend').onclick = send; root.querySelector('#mIn').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
      await poll(); timer = setInterval(poll, 3000); root.querySelector('#mIn').focus();
    }
    if (withName) showThread(withName); else showList();
  }

  async function openTrade(name) {
    if (!needOnline()) return;
    const meKey = localStorage.getItem(K.session);
    if (String(name).toLowerCase() === meKey) return toast('You cannot trade with yourself.', 'bad');
    const sp = profile(name);
    if (sp && sp.seed) return toast(sp.username + ' is a demo player and cannot trade. Trade with a real account instead.', 'bad');
    let them; try { them = await fetchProfile(name); } catch (e) { return toast(e.offline ? OFFLINE_MSG : (e.message || 'Player not found.'), 'bad'); }
    const mine = current().inventory.map(hydrate).sort((a, b) => rapOf(b) - rapOf(a)), theirs = them.inventory.slice().sort((a, b) => rapOf(b) - rapOf(a));
    const give = new Set(), get = new Set();
    const row = (i, side) => `<button type="button" class="trow" data-side="${side}" data-id="${esc(i.id)}"><span class="ti">${iconOf(i)}</span><span class="tn">${esc(i.name)}</span><span class="tr">RAP ${fmt(rapOf(i))}</span></button>`;
    const m = modal(`<h3>🔁 Send Trade to ${nameHtml(them)}</h3><p>Tap the items to trade. RAP (recent average price) shows what each item is really worth.</p>
      <div class="tgrid"><div><h4>You give <span class="muted" id="gSum"></span></h4><div class="tlist" id="tGive">${mine.length ? mine.map(i => row(i, 'give')).join('') : '<p class="muted">You do not own any items yet.</p>'}</div></div>
      <div><h4>You get <span class="muted" id="rSum"></span></h4><div class="tlist" id="tGet">${theirs.length ? theirs.map(i => row(i, 'get')).join('') : '<p class="muted">They do not own any items yet.</p>'}</div></div></div>
      <div class="tfair" id="tFair"></div><input class="field" id="tNote" maxlength="140" placeholder="Add a note (optional)"><div class="err" id="tErr"></div>
      <div class="row"><button class="btn outline" id="tNo">Cancel</button><button class="btn primary" id="tSend">🔁 Send Trade</button></div>`, 'wide');
    const el = m.el, byId = (list, id) => list.find(x => String(x.id) === id);
    const paint = () => {
      const g = rapSum([...give].map(id => byId(mine, id))), r = rapSum([...get].map(id => byId(theirs, id)));
      el.querySelector('#gSum').textContent = give.size ? `· ${give.size} item${give.size > 1 ? 's' : ''} · RAP ${fmt(g)}` : '';
      el.querySelector('#rSum').textContent = get.size ? `· ${get.size} item${get.size > 1 ? 's' : ''} · RAP ${fmt(r)}` : '';
      let msg, cls = '';
      if (!g && !r) msg = 'Pick items on either side to build your offer.';
      else if (!r) { msg = `You are giving ${fmt(g)} RAP and asking for nothing back.`; cls = 'bad'; }
      else if (!g) { msg = `You are asking for ${fmt(r)} RAP and offering nothing, they will probably decline.`; cls = 'bad'; }
      else { const diff = r - g, pct = Math.round(Math.abs(diff) / Math.max(g, r) * 100);
        if (pct <= 10) { msg = `Fair trade: both sides are within 10% RAP (${fmt(g)} vs ${fmt(r)}).`; cls = 'ok'; }
        else if (diff > 0) { msg = `You get ${fmt(diff)} RAP more than you give (+${pct}%). They may decline.`; cls = 'warn'; }
        else { msg = `You give ${fmt(-diff)} RAP more than you get (-${pct}%). Good for them, not for you.`; cls = 'warn'; } }
      const f = el.querySelector('#tFair'); f.textContent = msg; f.className = 'tfair ' + cls;
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('.trow'); if (!b) return;
      const set = b.dataset.side === 'give' ? give : get, id = b.dataset.id;
      if (set.has(id)) set.delete(id); else { if (set.size >= 12) return toast('Max 12 items per side.', 'bad'); set.add(id); }
      b.classList.toggle('on', set.has(id)); paint();
    });
    el.querySelector('#tNo').onclick = m.close;
    el.querySelector('#tSend').onclick = async () => {
      if (!give.size && !get.size) return el.querySelector('#tErr').textContent = 'Pick at least one item.';
      el.querySelector('#tSend').disabled = true;
      try { await api('/api/trades', { to: them.username, give: [...give], get: [...get], note: el.querySelector('#tNote').value }); m.close(); toast('Trade sent to ' + them.username + '!', 'ok'); }
      catch (e) { el.querySelector('#tErr').textContent = e.offline ? OFFLINE_MSG : e.message; el.querySelector('#tSend').disabled = false; }
    };
    paint();
  }

  function openTrades(initialTab) {
    if (!needOnline()) return;
    const m = modal('<div id="tt"></div>', 'wide'), root = m.el.querySelector('#tt'); let tab = initialTab || 'in', all = [], timer = null;
    const stop = () => clearInterval(timer);
    const mini = list => list.length ? list.map(i => `<div class="titem"><span>${iconOf(i)}</span><span class="tn">${esc(i.name)}</span><span class="tr">${fmt(rapOf(i))}</span></div>`).join('') : '<div class="titem muted">Nothing</div>';
    const LABEL = { accepted: '✔ Completed', declined: '✖ Declined', cancelled: 'Cancelled', failed: 'Failed (items changed)', pending: 'Waiting' };
    function draw() {
      const inc = all.filter(t => !t.mine && t.status === 'pending'), out = all.filter(t => t.mine && t.status === 'pending'), hist = all.filter(t => t.status !== 'pending');
      const list = tab === 'in' ? inc : tab === 'out' ? out : hist;
      const tabs = [['in', `📥 Incoming (${inc.length})`], ['out', `📤 Sent (${out.length})`], ['hist', '🕘 History']];
      root.innerHTML = `<h3>🔁 Trades</h3><div class="chipbar" style="margin-bottom:12px">${tabs.map(t => `<button class="fchip ${t[0] === tab ? 'on' : ''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div>
        <div class="tlist big">${list.length ? list.map(t => {
          const other = t.mine ? t.to : t.from, left = t.mine ? 'You give' : esc(t.from) + ' gives', right = t.mine ? 'You get' : 'You give';
          const lr = rapSum(t.give), rr = rapSum(t.get);
          return `<div class="tcard"><div class="thead"><b>${t.mine ? 'To ' : 'From '}${nameOf(other)}</b><span class="muted">${LABEL[t.status] || t.status} · ${new Date(t.at).toLocaleDateString()}</span></div>
            <div class="tgrid"><div><small class="muted">${left} · RAP ${fmt(lr)}</small>${mini(t.give)}</div><div><small class="muted">${right} · RAP ${fmt(rr)}</small>${mini(t.get)}</div></div>
            ${t.note ? `<div class="tnote">"${esc(t.note)}"</div>` : ''}
            ${t.status === 'pending' ? `<div class="row">${t.mine ? `<button class="btn outline" data-act="cancel" data-id="${t.id}">Cancel trade</button>` : `<button class="btn outline" data-act="decline" data-id="${t.id}">Decline</button><button class="btn primary" data-act="accept" data-id="${t.id}">Accept</button>`}</div>` : ''}</div>`;
        }).join('') : '<p class="muted empty">' + (tab === 'in' ? 'No incoming trades.' : tab === 'out' ? 'You have no pending trades.' : 'No finished trades yet.') + '</p>'}</div>
        <div class="row"><button class="btn primary" id="tClose">Close</button></div>`;
      root.querySelector('#tClose').onclick = () => { stop(); m.close(); };
    }
    async function load() {
      if (!document.body.contains(root)) return stop();
      try { all = (await api('/api/trades')).trades; draw(); } catch (e) { root.innerHTML = '<p class="muted empty">' + esc(e.offline ? OFFLINE_MSG : e.message) + '</p><div class="row"><button class="btn primary" id="tClose">Close</button></div>'; root.querySelector('#tClose').onclick = m.close; stop(); }
    }
    root.addEventListener('click', async e => {
      const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; return draw(); }
      const b = e.target.closest('[data-act]'); if (!b) return;
      b.disabled = true;
      try {
        await api('/api/trades/' + b.dataset.act, { id: +b.dataset.id });
        if (b.dataset.act === 'accept') { await syncOnce(); toast('Trade accepted! Items swapped.', 'ok'); tab = 'hist'; } else toast(b.dataset.act === 'decline' ? 'Trade declined.' : 'Trade cancelled.');
      } catch (err) { toast(err.offline ? OFFLINE_MSG : err.message, 'bad'); }
      load();
    });
    load(); timer = setInterval(load, 5000);
  }

  document.addEventListener('click', e => {
    const s = e.target.closest('[data-social]'); if (s) { e.preventDefault(); return s.dataset.social === 'messages' ? openMessages() : openTrades(); }
    const mu = e.target.closest('[data-msg-user]'); if (mu) return openMessages(mu.dataset.msgUser);
    const tu = e.target.closest('[data-trade-user]'); if (tu) return openTrade(tu.dataset.tradeUser);
  });

  return {
    PLANS, CATALOG, CATS_META, GROUPS, STORE, STORE_BY_ID, WELCOME_BX, fmt, esc, level, register, login, logout, current, requireAuth, update, activePlan, ownedIds,
    addBx, subscribe, listings, sales, findItem, buyItem, addListing, buyStore, equip, setBio, profile, allPlayers, randomPlayers, avatarStyle, nameHtml, nameOf, badgeHtml,
    profileUrl, sellerLink, toast, modal, badge, ago, card, handleBuy, showItem, bindItems,
    stockLeft, warnOf, fmtDate, chatReply, chatHistory, chatPush, chatSend, chatClear,
    rapOf, fetchProfile, refreshPlayers, realOnline, startSync, syncOnce, openMessages, openTrade, openTrades, social: SOCIAL, online: () => !!token()
  };
})();
