// ---------------------------------------------------------------------------
// 🟢 MySQL Backend API Endpoint & Supabase Query Emulator Config
// ---------------------------------------------------------------------------

const storedUrl = typeof window !== 'undefined' ? localStorage.getItem('MST_API_URL') : null;

// Default API URL points to our unified express /api endpoint
const DEFAULT_URL = "/api";

export const API_URL = storedUrl || DEFAULT_URL;

export const isConfigured = true;

// Stores connection settings and refreshes the application
export const saveConfig = (url: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('MST_API_URL', url);
        window.location.reload();
    }
};

// Removes stored connection settings and refreshes the application
export const clearConfig = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('MST_API_URL');
        window.location.reload();
    }
};

// Unified REST Fetch Client
const runQuery = async (body: any) => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        return await response.json();
    } catch (e: any) {
        console.error("Emulator query failed:", e);
        return { data: null, error: e.message || String(e) };
    }
};

// 🛡️ Supabase Fluent Query Builder Emulator
export const supabase = {
    auth: {
        signUp: async () => ({ data: {}, error: null }),
        signInWithPassword: async () => ({ data: {}, error: null }),
        signOut: async () => ({ error: null }),
    },
    removeChannel: async () => {},
    channel: () => ({
        on: function() { return this; },
        subscribe: function() { return this; }
    }),
    from: (table: string) => {
        let selectFields = '*';
        let filterField: string | null = null;
        let filterVal: any = null;
        let limitNum: number | null = null;
        let orderCol: string | null = null;
        let isSingle = false;

        const builder = {
            select: (fields: string = '*') => {
                selectFields = fields;
                return builder;
            },
            eq: (field: string, value: any) => {
                filterField = field;
                filterVal = value;
                return builder;
            },
            order: (col: string) => {
                orderCol = col;
                return builder;
            },
            limit: (num: number) => {
                limitNum = num;
                return builder;
            },
            single: async () => {
                isSingle = true;
                return await builder.execute();
            },
            maybeSingle: async () => {
                isSingle = true;
                return await builder.execute();
            },
            execute: async () => {
                const res = await runQuery({
                    action: 'supabaseQuery',
                    table,
                    operation: 'select',
                    selectFields,
                    filterField,
                    filterVal,
                    isSingle,
                    orderCol,
                    limitNum
                });
                return { data: res.data, error: res.error ? { message: res.error } : null };
            },
            insert: async (payload: any) => {
                const res = await runQuery({
                    action: 'supabaseQuery',
                    table,
                    operation: 'insert',
                    payload
                });
                return { data: res.data, error: res.error ? { message: res.error } : null };
            },
            update: (payload: any) => {
                return {
                    eq: (field: string, value: any) => {
                        filterField = field;
                        filterVal = value;
                        return {
                            execute: async () => {
                                const res = await runQuery({
                                    action: 'supabaseQuery',
                                    table,
                                    operation: 'update',
                                    payload,
                                    filterField,
                                    filterVal
                                });
                                return { data: res.data, error: res.error ? { message: res.error } : null };
                            },
                            then: function<TResult1 = any, TResult2 = never>(
                                onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
                                onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
                            ): Promise<TResult1 | TResult2> {
                                return this.execute().then(onfulfilled, onrejected);
                            }
                        };
                    }
                };
            },
            delete: () => {
                return {
                    eq: (field: string, value: any) => {
                        filterField = field;
                        filterVal = value;
                        return {
                            execute: async () => {
                                const res = await runQuery({
                                    action: 'supabaseQuery',
                                    table,
                                    operation: 'delete',
                                    filterField,
                                    filterVal
                                });
                                return { data: res.data, error: res.error ? { message: res.error } : null };
                            },
                            then: function<TResult1 = any, TResult2 = never>(
                                onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
                                onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
                            ): Promise<TResult1 | TResult2> {
                                return this.execute().then(onfulfilled, onrejected);
                            }
                        };
                    }
                };
            },
            then: function<TResult1 = any, TResult2 = never>(
                onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
                onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
            ): Promise<TResult1 | TResult2> {
                return this.execute().then(onfulfilled, onrejected);
            }
        };
        return builder;
    }
};

export const db = supabase;

