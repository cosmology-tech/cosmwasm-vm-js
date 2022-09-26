import { eddsa as ellipticEddsa } from "elliptic";

declare global {
  var _eddsa: ellipticEddsa; // we use a global to prevent serialization issues for the calling class
  function eddsa(): ellipticEddsa;
}

export {};
