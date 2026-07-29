import { useEffect, useState } from "react";
import { alumniPhotoUrl } from "../../lib/api.js";

export default function ProfileAvatar({
  name = "Alumni",
  url = "",
  size = "md",
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  const dimensions =
    size === "lg"
      ? "h-20 w-20 text-2xl"
      : size === "sm"
        ? "h-9 w-9 text-sm"
        : "h-12 w-12 text-base";
  const source = alumniPhotoUrl(url);
  if (source && !failed)
    return (
      <img
        src={source}
        alt={`${name} profile`}
        className={`${dimensions} shrink-0 rounded-full object-cover`}
        onError={() => setFailed(true)}
      />
    );
  return (
    <span
      className={`${dimensions} inline-flex shrink-0 items-center justify-center rounded-full bg-sky-500 font-black text-white`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
