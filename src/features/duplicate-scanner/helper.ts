export const formatWithEllipsis = (sentences: string): string => {
  const ellipsis = "...";

  if (sentences.length === 0) {
    return ellipsis;
  }
  if (sentences.charAt(sentences.length - 1) !== ".") {
    return sentences + ellipsis;
  }
  return sentences + "..";
};
