// utils/fedapay.js
import { createHmac, timingSafeEqual } from "crypto";

export function verifyFedapaySignature(rawBody, sig, secret) {
  if (!sig || !rawBody || !secret) return false;

  const parts     = Object.fromEntries(sig.split(",").map(p => p.split("=")));
  const timestamp = parts["t"];
  const hash      = parts["s"];

  if (!timestamp || !hash) return false;

  const payload  = `${timestamp}.${rawBody.toString()}`;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");

  const sigBuf = Buffer.from(hash,     "hex");
  const expBuf = Buffer.from(expected, "hex");

  if (sigBuf.length !== expBuf.length) return false;

  return timingSafeEqual(sigBuf, expBuf);
}