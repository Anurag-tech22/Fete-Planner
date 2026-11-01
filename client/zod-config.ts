import { z } from "zod";

// Our strict CSP forbids eval, so tell Zod not to probe for its optional JIT compiler (it would log a CSP violation).
// This module must be imported before any schema is created, i.e. first in main.tsx.
z.config({ jitless: true });
