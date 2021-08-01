export const snakeToCamel = (str: string) => str.replace(/(\_\w)/g, m => m[1].toUpperCase());
export const camelToSnake = (str: string) => str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);

/**
 * Camelize a string
 * @param {String} str
 * @returns {String}
 */
 export const camelize = (str: string): string => {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
};

/**
 * Gets indices of something on a string
 * @param {String} searchStr
 * @param {String} str
 * @param {Boolean} caseSensitive
 * @returns {Array}
 */
export const getIndicesOf = (search: string, str: string, caseSensitive: boolean): number[] => {
  const searchLen = search.length;
  if (searchLen == 0) {
    return [];
  }

  let parsedSearch = search;
  let parsedStr = str;
  let index: number;
  let startIndex = 0;
  const indices = [] as number[];

  if (!caseSensitive) {
    parsedStr = parsedStr.toLowerCase();
    parsedSearch = parsedSearch.toLowerCase();
  }

  while ((index = parsedStr.indexOf(parsedSearch, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + searchLen;
  }

  return indices;
};
