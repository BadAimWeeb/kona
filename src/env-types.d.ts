declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT?: string;
            LOCAL_STORAGE_PATH: string;
            MAX_FILE_SIZE: string;
            SERVER_ADDRESS: string;

            API_AUTH_ENABLED: "true" | "false";
            MASTER_API_KEY?: string;

            DATABASE_TYPE: "MYSQL" | "MARIADB" | "SQLITE" | "MSSQL" | "POSTGRES";

            // SQLite-specific config
            SQLITE_DATABASE_PATH?: string;

            // MySQL/MariaDB/SQL Server/PostgreSQL general config
            SQL_DATABASE_HOSTNAME: string;
            SQL_DATABASE_PORT: string;
            SQL_DATABASE_USERNAME: string;
            SQL_DATABASE_PASSWORD: string;
            SQL_DATABASE_NAME: string;
            SQL_DATABASE_SSL_ENABLED: string;

            // SQL Server-specific config
            MSSQL_DATABASE_DOMAIN?: string;
            MSSQL_INSTANCE_NAME?: string;
        }
    }
}

export {}
