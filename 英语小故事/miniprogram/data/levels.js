const LEVELS = [
  { id: 1,  name: 'Seed',     color: '#BBDDD0', description: '基础词汇，2-3岁词汇量',     maxWordLength: 4 },
  { id: 2,  name: 'Leaf',     color: '#C5E0B4', description: '常见高频词，幼儿园水平',     maxWordLength: 5 },
  { id: 3,  name: 'Bird',     color: '#FFE8AA', description: '简单句型，一年级水平',       maxWordLength: 6 },
  { id: 4,  name: 'River',    color: '#FFCBAA', description: '基础故事，二年级水平',       maxWordLength: 7 },
  { id: 5,  name: 'Cloud',    color: '#B4D4E8', description: '短篇故事，三年级水平',       maxWordLength: 8 },
  { id: 6,  name: 'Wind',     color: '#C9BAEE', description: '简单对话，四年级水平',       maxWordLength: 9 },
  { id: 7,  name: 'Rain',     color: '#A8DADA', description: '丰富情节，五年级水平',       maxWordLength: 10 },
  { id: 8,  name: 'Star',     color: '#F5C5CE', description: '复杂句型，六年级水平',       maxWordLength: 11 },
  { id: 9,  name: 'Moon',     color: '#D4C5A9', description: '章节故事，初中初级',         maxWordLength: 12 },
  { id: 10, name: 'Sun',      color: '#FFE0A8', description: '多线情节，初中中级',         maxWordLength: 13 },
  { id: 11, name: 'Ocean',    color: '#A8D8E8', description: '文学语言，初中高级',         maxWordLength: 14 },
  { id: 12, name: 'Mountain', color: '#B8DDB8', description: '深度故事，高中初级',         maxWordLength: 15 },
  { id: 13, name: 'Sky',      color: '#B8D0F0', description: '复杂叙事，高中中级',         maxWordLength: 16 },
  { id: 14, name: 'Universe', color: '#FFD4B4', description: '高级文学，高中高级',         maxWordLength: 18 },
  { id: 15, name: 'Galaxy',   color: '#E8B8C8', description: '原版阅读，母语水平',         maxWordLength: 999 },
]

function getLevelById(id) {
  return LEVELS.find(l => l.id === id)
}

module.exports = { LEVELS, getLevelById }
