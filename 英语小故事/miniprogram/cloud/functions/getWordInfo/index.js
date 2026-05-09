const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')
const crypto = require('crypto')

// VolcEngine translate: set VOLCENGINE_TRANSLATE_AK / VOLCENGINE_TRANSLATE_SK in cloud env
const TRANSLATE_AK = process.env.VOLCENGINE_TRANSLATE_AK || ''
const TRANSLATE_SK = process.env.VOLCENGINE_TRANSLATE_SK || ''

// 常见词本地映射（直接返回，不调 API）
const CHINESE = {
  // 基础动词
  see: '看见', go: '去', come: '来', get: '得到', know: '知道',
  think: '想，认为', look: '看', want: '想要', give: '给', use: '使用',
  find: '找到', tell: '告诉', ask: '问', seem: '似乎', feel: '感觉',
  leave: '离开', call: '叫，打电话', keep: '保持', let: '让', begin: '开始',
  show: '展示', hear: '听见', play: '玩，演奏', run: '跑', move: '移动',
  live: '住，生活', walk: '走', stand: '站', turn: '转', start: '开始',
  bring: '带来', hold: '拿，握', write: '写', sit: '坐', put: '放',
  eat: '吃', drink: '喝', sleep: '睡觉', read: '读', sing: '唱',
  jump: '跳', fly: '飞', swim: '游泳', draw: '画', help: '帮助',
  open: '打开', close: '关闭', pick: '摘，挑选', make: '做', take: '拿',
  say: '说', talk: '讲话', smile: '微笑', laugh: '笑', cry: '哭',
  hop: '单脚跳', spin: '旋转', kick: '踢', wave: '挥手', clap: '鼓掌',
  hug: '拥抱', kiss: '亲吻', push: '推', pull: '拉', carry: '携带，搬运',
  ride: '骑', climb: '爬', hide: '躲藏', catch: '抓住', throw: '扔',
  build: '建造', break: '打破', fix: '修理', clean: '打扫，干净的',
  try: '尝试', learn: '学习', teach: '教', remember: '记得', forget: '忘记',
  follow: '跟随', wait: '等待', watch: '看，观察', listen: '听', rest: '休息',
  plant: '种植', water: '浇水，水', grow: '生长', cook: '烹饪', bake: '烘烤',
  mix: '混合', share: '分享', save: '救，节省', lose: '丢失，失去', win: '赢',
  decide: '决定', choose: '选择', explain: '解释', wonder: '想知道，感到惊奇',
  worry: '担心', hope: '希望', wish: '希望，愿望', believe: '相信',
  // 过去式
  sat: '坐（过去式）', fell: '落下（过去式）', sang: '唱（过去式）',
  blew: '吹（过去式）', heard: '听见（过去式）', picked: '摘（过去式）',
  took: '拿（过去式）', came: '来（过去式）', felt: '感觉（过去式）',
  went: '去（过去式）', made: '做（过去式）', said: '说（过去式）',
  ran: '跑（过去式）', flew: '飞（过去式）', found: '找到（过去式）',
  gave: '给（过去式）', got: '得到（过去式）', knew: '知道（过去式）',
  saw: '看见（过去式）', told: '告诉（过去式）', thought: '想（过去式）',
  brought: '带来（过去式）', kept: '保持（过去式）', held: '握住（过去式）',
  wore: '穿着（过去式）', woke: '醒来（过去式）', stood: '站（过去式）',
  built: '建造（过去式）', put: '放（过去/现在式）', read: '读（过去/现在式）',
  // 进行时 / 其他变形
  raining: '正在下雨', wearing: '穿着', running: '跑', jumping: '跳',
  walking: '走路', playing: '玩', smiling: '微笑', laughing: '笑',
  swimming: '游泳', sleeping: '睡觉', eating: '吃', singing: '唱歌',
  mixed: '混合', smelled: '闻起来', shared: '分享', smiled: '微笑',
  walked: '走', helped: '帮助', looked: '看', called: '叫，打电话',
  // 形容词
  big: '大的', small: '小的', little: '小的', good: '好的', bad: '坏的',
  happy: '高兴的', sad: '悲伤的', hot: '热的', cold: '冷的', new: '新的',
  old: '旧的，老的', long: '长的', short: '短的', fast: '快的', slow: '慢的',
  hard: '硬的，努力地', soft: '软的', kind: '善良的', brave: '勇敢的',
  afraid: '害怕的', proud: '自豪的', fat: '胖的', red: '红色的',
  dark: '黑暗的', bright: '明亮的，聪明的', deep: '深的', quiet: '安静的',
  loud: '大声的', strong: '强壮的', weak: '虚弱的', heavy: '重的', light: '轻的，光',
  round: '圆的', flat: '平的', sharp: '尖的', smooth: '光滑的', rough: '粗糙的',
  clean: '干净的', dirty: '脏的', wet: '湿的', dry: '干燥的',
  warm: '温暖的', cool: '凉爽的', cozy: '舒适的', safe: '安全的',
  lost: '迷失的', sick: '生病的', tired: '疲倦的', hungry: '饿的', full: '满的',
  beautiful: '美丽的', pretty: '漂亮的', lovely: '可爱的', sweet: '甜的，甜蜜的',
  shy: '害羞的', lonely: '孤独的', nervous: '紧张的', excited: '兴奋的',
  surprised: '惊讶的', angry: '生气的', careful: '小心的', clever: '聪明的',
  ordinary: '普通的', special: '特别的', perfect: '完美的', wonderful: '精彩的',
  terrible: '可怕的', strange: '奇怪的', tiny: '极小的', huge: '巨大的',
  young: '年轻的', tall: '高的', low: '低的', wide: '宽的', narrow: '窄的',
  yellow: '黄色的', green: '绿色的', blue: '蓝色的', white: '白色的',
  black: '黑色的', brown: '棕色的', orange: '橙色的', purple: '紫色的', pink: '粉红色的',
  shiny: '闪亮的', fluffy: '蓬松的', furry: '毛茸茸的',
  // 名词——自然
  sun: '太阳', moon: '月亮', star: '星星', sky: '天空', tree: '树',
  flower: '花', water: '水', rain: '雨', wind: '风', snow: '雪',
  cloud: '云', grass: '草', leaf: '叶子', seed: '种子', branch: '树枝',
  mountain: '山', river: '河流', lake: '湖', sea: '大海', ocean: '海洋',
  forest: '森林', garden: '花园', field: '田野', park: '公园',
  rainbow: '彩虹', lightning: '闪电', thunder: '雷声', storm: '风暴',
  // 名词——动物
  bird: '鸟', cat: '猫', dog: '狗', fish: '鱼', horse: '马',
  rabbit: '兔子', mouse: '老鼠', bear: '熊', lion: '狮子', tiger: '老虎',
  duck: '鸭子', chicken: '鸡', cow: '奶牛', pig: '猪', sheep: '羊',
  butterfly: '蝴蝶', bee: '蜜蜂', frog: '青蛙', snake: '蛇', dragon: '龙',
  puppy: '小狗', kitten: '小猫', chick: '小鸡', cub: '幼崽',
  // 名词——食物
  apple: '苹果', cake: '蛋糕', cookie: '饼干', bread: '面包',
  milk: '牛奶', egg: '鸡蛋', butter: '黄油', flour: '面粉',
  soup: '汤', rice: '米饭', fruit: '水果', vegetable: '蔬菜',
  tomato: '番茄', carrot: '胡萝卜', honey: '蜂蜜', chocolate: '巧克力',
  sandwich: '三明治', muffin: '松饼', pancake: '薄饼', juice: '果汁',
  dinner: '晚饭', lunch: '午饭', breakfast: '早饭', meal: '一餐',
  oven: '烤箱', kitchen: '厨房',
  // 名词——人物
  family: '家庭', mom: '妈妈', dad: '爸爸', sister: '姐妹', brother: '兄弟',
  friend: '朋友', girl: '女孩', boy: '男孩', child: '孩子', baby: '婴儿',
  teacher: '老师', doctor: '医生', farmer: '农夫', engineer: '工程师',
  grandma: '奶奶/外婆', grandpa: '爷爷/外公', neighbor: '邻居', stranger: '陌生人',
  // 名词——地点和物品
  home: '家', school: '学校', house: '房子', room: '房间', door: '门',
  window: '窗户', floor: '地板', wall: '墙', roof: '屋顶', bridge: '桥',
  book: '书', bag: '包', ball: '球', bed: '床', chair: '椅子', table: '桌子',
  toy: '玩具', kite: '风筝', boat: '船', car: '汽车', bus: '公共汽车',
  bike: '自行车', umbrella: '雨伞', scarf: '围巾', coat: '外套', shoe: '鞋子',
  hat: '帽子', shirt: '衬衫', box: '盒子', bag: '袋子', basket: '篮子',
  candle: '蜡烛', lamp: '灯', key: '钥匙', map: '地图', letter: '信',
  notebook: '笔记本', pencil: '铅笔', crayon: '蜡笔', paint: '颜料',
  brush: '刷子，画笔', string: '绳子', fence: '篱笆', bench: '长椅',
  swing: '秋千', slide: '滑梯', nest: '巢', puddle: '水坑', boot: '靴子',
  gift: '礼物', coin: '硬币', prize: '奖品', medal: '奖章',
  // 副词 / 介词 / 其他
  song: '歌曲', breath: '呼吸', light: '光，灯',
  together: '一起', suddenly: '突然', slowly: '慢慢地', quickly: '迅速地',
  carefully: '小心地', quietly: '安静地', gently: '轻柔地', proudly: '自豪地',
  finally: '最终', always: '总是', never: '从不', sometimes: '有时',
  already: '已经', still: '仍然', soon: '不久', again: '再次', also: '也',
  away: '离开', outside: '外面', inside: '里面', upstairs: '楼上', far: '远',
  across: '穿过', through: '穿过', behind: '在…后面', beside: '在…旁边',
  much: '很多', each: '每个', every: '每', enough: '足够', both: '两者都',
  today: '今天', yesterday: '昨天', tomorrow: '明天', morning: '早晨',
  evening: '傍晚', night: '夜晚', week: '周', year: '年', spring: '春天',
  summer: '夏天', autumn: '秋天', winter: '冬天',
  // 代词
  all: '所有', love: '爱', have: '有', up: '向上', out: '出去',
  one: '一个', our: '我们的', him: '他', her: '她的',
  them: '他们', his: '他的', she: '她', they: '他们', when: '当…时',
  this: '这个', that: '那个', these: '这些', those: '那些',
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex')
}

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest()
}

function hmacHex(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex')
}

async function translateToZh(text) {
  if (!TRANSLATE_AK || TRANSLATE_AK === 'YOUR_ACCESS_KEY_ID') return ''

  const now = new Date()
  const datetime = now.toISOString().replace(/[:\-]/g, '').replace(/\.\d+Z/, 'Z').slice(0, 16) + '00Z'
  const date = datetime.slice(0, 8)

  const host = 'open.volcengineapi.com'
  const service = 'translate'
  const region = 'cn-north-1'
  const action = 'TranslateText'
  const version = '2020-06-01'

  const bodyStr = JSON.stringify({ SourceLanguage: 'en', TargetLanguage: 'zh', TextList: [text] })
  const queryString = `Action=${action}&Version=${version}`
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-date:${datetime}\n`
  const signedHeaders = 'content-type;host;x-date'
  const canonicalRequest = ['POST', '/', queryString, canonicalHeaders, signedHeaders, sha256(bodyStr)].join('\n')

  const credentialScope = `${date}/${region}/${service}/request`
  const stringToSign = ['HMAC-SHA256', datetime, credentialScope, sha256(canonicalRequest)].join('\n')

  const signingKey = hmac(hmac(hmac(hmac(`volc${TRANSLATE_SK}`, date), region), service), 'request')
  const signature = hmacHex(signingKey, stringToSign)
  const authorization = `HMAC-SHA256 Credential=${TRANSLATE_AK}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return new Promise((resolve) => {
    const req = https.request({
      hostname: host,
      path: `/?${queryString}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': host,
        'X-Date': datetime,
        'Authorization': authorization,
      },
    }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try {
          const result = JSON.parse(Buffer.concat(chunks).toString())
          const translated = result.TranslationList && result.TranslationList[0] && result.TranslationList[0].Translation
          resolve(translated || '')
        } catch { resolve('') }
      })
    })
    req.on('error', () => resolve(''))
    req.write(bodyStr)
    req.end()
  })
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())) } catch { reject(new Error('json parse fail')) }
      })
    }).on('error', reject)
  })
}

exports.main = async (event) => {
  const { word } = event
  if (!word) return { error: 'word required' }

  const lower = word.toLowerCase()

  // 1. 查词库缓存
  try {
    const cached = await db.collection('words').where({ word: lower }).limit(1).get()
    if (cached.data.length > 0) return { word: cached.data[0] }
  } catch {}

  // 2. 调 Free Dictionary API 拿音标/词性/英文释义
  let dictData = null
  try {
    const result = await httpGet(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(lower)}`)
    if (Array.isArray(result) && result[0]) {
      const entry = result[0]
      const meaning = entry.meanings && entry.meanings[0]
      const def = meaning && meaning.definitions && meaning.definitions[0]
      const phonetics = entry.phonetics || []
      const phoneticEntry = phonetics.find(p => p.text) || {}
      const audioEntry = phonetics.find(p => p.audio && p.audio.includes('-us'))
                       || phonetics.find(p => p.audio && p.audio.length > 0)
                       || {}
      dictData = {
        word: lower,
        phonetic: phoneticEntry.text || '',
        audioUrl: audioEntry.audio || '',
        partOfSpeech: (meaning && meaning.partOfSpeech) || '',
        definition: (def && def.definition) || '',
        displayDefinition: '',
      }
    }
  } catch {}

  if (!dictData) return { word: null }

  // 3. 中文释义：本地表 → 翻译 API
  const localZh = CHINESE[lower]
  if (localZh) {
    dictData.displayDefinition = localZh
  } else if (dictData.definition) {
    dictData.displayDefinition = await translateToZh(dictData.definition)
  }

  // 4. 写入词库缓存（仅在有中文释义时才缓存，避免缓存空结果）
  if (dictData.displayDefinition) {
    try {
      await db.collection('words').add({ data: dictData })
    } catch {}
  }

  return { word: dictData }
}
