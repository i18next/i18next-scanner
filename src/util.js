export const removeComments = (code) => {
  code = code.replace(/\/\/.*$/gm, "");
  code = code.replace(/\/\*[\s\S]*?\*\//gm, "");
  code = code.replace(/\/\*\*[\s\S]*?\*\//gm, "");
  return code;
};
