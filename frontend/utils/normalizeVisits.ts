const PRE_OP_LIST = [
  "pre op",
  "preop",
  "pre_op",
  "pre-op",
  "pre op1",
  "preop1",
];

const POST_OP_LIST = [
  "post op",
  "postop",
  "post_op",
  "post-op",
  "post op1",
  "postop1",
];

export function normalizeVisit(raw: string): string {
  if (!raw) return "";

  let v = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const opNumberMatch = v.match(/(?:op|operation)?\s*(\d+)/);
  const opNumber = opNumberMatch ? parseInt(opNumberMatch[1]) : 1;

  const hasPre = v.includes("pre");
  const hasPost = v.includes("post");

  const dayMatch = v.match(/(\d+)\s*day/);
  const monthMatch = v.match(/(\d+)\s*month/);
  const weekMatch = v.match(/(\d+)\s*week/);
  const yearMatch = v.match(/(\d+)\s*year/);

  if (hasPre && !dayMatch && !monthMatch && !weekMatch && !yearMatch) {
    return opNumber > 1 ? `pre_op_${opNumber}` : "pre_op";
  }

  if (hasPost && !dayMatch && !monthMatch && !weekMatch && !yearMatch) {
    return opNumber > 1 ? `post_op_${opNumber}` : "post_op";
  }

  if (dayMatch) {
    const n = parseInt(dayMatch[1]);
    return opNumber > 1 ? `${n}d_after_op${opNumber}` : `${n}d`;
  }

  if (weekMatch) {
    const n = parseInt(weekMatch[1]);
    return opNumber > 1 ? `${n}w_after_op${opNumber}` : `${n}w`;
  }

  if (monthMatch) {
    const n = parseInt(monthMatch[1]);
    if (hasPost || hasPre) {
      return opNumber > 1 ? `${n}m_after_op${opNumber}` : `${n}m`;
    }
    return `${n}m`;
  }

  if (yearMatch) {
    const n = parseInt(yearMatch[1]);
    if (hasPost || hasPre) {
      return opNumber > 1 ? `${n}y_after_op${opNumber}` : `${n}y`;
    }
    return `${n}y`;
  }

  if (PRE_OP_LIST.includes(v)) return "pre_op";
  if (POST_OP_LIST.includes(v)) return "post_op";

  return v.replace(/\s+/g, "_");
}
