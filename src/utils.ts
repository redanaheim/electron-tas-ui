export const rand_string = function (size = 10): string {
  return Math.round(Math.random() * 10 ** Math.round(size)).toString(36);
};
