class TrieNode {
  constructor() {
    this.children = new Map();
    this.word = null;
  }
}

// ?ы듃?대━???ъ씤?? ?뱀닔臾몄옄, 諛섎났臾몄옄, leetspeak瑜??뺢퇋?뷀빐 湲덉튃???고쉶 ?낅젰??以꾩엯?덈떎.
function normalizeText(value) {
  const leetMap = {
    0: 'o',
    1: 'i',
    3: 'e',
    4: 'a',
    5: 's',
    7: 't',
    '@': 'a',
    '$': 's',
  };

  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[013457@$]/g, (char) => leetMap[char] ?? char)
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/[^a-z0-9媛-?ｃ꽦-?롢뀖-?ａ?-??/g, '');
}

// ?ы듃?대━???ъ씤?? Trie ?먮즺援ъ“濡????湲덉튃??紐⑸줉??鍮좊Ⅴ寃??먯깋?섎뒗 而ㅼ뒪? ?꾪꽣 ?붿쭊?낅땲??
export class FastScanner {
  constructor(words = []) {
    this.root = new TrieNode();
    words.forEach((word) => this.add(word));
  }

  add(word) {
    const normalized = normalizeText(word);
    if (normalized.length < 2) return;
    
    let node = this.root;
    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());}
      node = node.children.get(char);}
    node.word = normalized;
  }

  search(text) {
    const normalized = normalizeText(text);
    for (let start = 0; start < normalized.length; start += 1) {
      let node = this.root;
      for (let index = start; index < normalized.length; index += 1) {
        node = node.children.get(normalized[index]);
        if (!node) break;
        if (node.word) {return {found: true,word: node.word,index: start,};}
      }
    }

    return {
      found: false,
      word: null,
      index: -1,
    };
  }
}
