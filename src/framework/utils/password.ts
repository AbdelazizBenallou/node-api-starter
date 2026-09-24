import crypto from "node:crypto";
import argon2 from "argon2";

const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$u4jLJcqGexqwEDsKG7OQzMHDqPkx5aYW3Spnf0LuZgM$iRt5LW3KuGNWWGJIr8VvlUcB4uaY9tRJHcB0Gj1NMCE";

export const password = {
    hash: (plain: string) => argon2.hash(plain, { type: argon2.argon2id }),
    verify: (hash: string, plain: string) => argon2.verify(hash, plain),
    burn: () => argon2.verify(DUMMY_HASH, "constant-time-burn"),
};

export const tokenHash = (token: string) =>
    crypto.createHash("sha256").update(token).digest("hex");
