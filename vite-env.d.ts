/// <reference types="vite/client" />

declare module "papaparse" {
  export interface ParseResult<T> {
    data: T[];
    errors: unknown[];
    meta: unknown;
  }

  export interface ParseConfig<T> {
    skipEmptyLines?: boolean;
    complete?: (results: ParseResult<T>) => void;
    error?: (error: { message?: string }) => void;
  }

  const Papa: {
    parse<T>(file: File, config: ParseConfig<T>): void;
  };

  export default Papa;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
