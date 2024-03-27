declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT?: string;
            LOCAL_STORAGE_PATH: string;
            DATABASE_TYPE: "MYSQL" | "MARIADB" | "SQLITE" | "MSSQL" | "POSTGRES" | "ORACLE";

            // SQLite-specific config
            SQLITE_DATABASE_PATH?: string;
        }
    }
}

export {}