import { Model, Sequelize, type InferAttributes, type CreationOptional, DataTypes } from "sequelize";
import { randomStuff } from "./utils";

const db = (() => {
    switch (process.env.DATABASE_TYPE) {
        case "SQLITE":
            return new Sequelize({
                dialect: "sqlite",
                storage: process.env.SQLITE_DATABASE_PATH,
            });
        case "MARIADB":
        case "MYSQL":
        case "POSTGRES":
            return new Sequelize({
                dialect: (() => {
                    switch (process.env.DATABASE_TYPE) {
                        case "MARIADB": return "mariadb";
                        case "MYSQL": return "mysql";
                        case "POSTGRES": return "postgres";
                    }
                })(),
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });
        case "MSSQL":
            if (process.env.MSSQL_DATABASE_DOMAIN) {
                return new Sequelize({
                    dialect: "mssql",
                    dialectOptions: {
                        authentication: {
                            type: 'ntlm',
                            options: {
                                domain: process.env.MSSQL_DATABASE_DOMAIN,
                                userName: process.env.DB_USERNAME,
                                password: process.env.DB_PASSWORD
                            }
                        },
                        options: {
                            instanceName: process.env.MSSQL_INSTANCE_NAME
                        }
                    },
                    host: process.env.DB_HOST,
                    port: Number(process.env.DB_PORT),
                    database: process.env.DB_NAME
                });
            }

            return new Sequelize({
                dialect: "mssql",
                host: process.env.DB_HOST,
                port: Number(process.env.DB_PORT),
                username: process.env.DB_USERNAME,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME
            });
        default:
            throw new Error("Unsupported database type");
    }
})();
export const Database = db;

class APIKeys extends Model<InferAttributes<APIKeys, { omit: "createdAt" | "updatedAt" }>> {
    declare uuid: string;
    declare key: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

APIKeys.init({
    uuid: {
        type: DataTypes.UUIDV4,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    key: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: () => {
            return "kona_sk_" + randomStuff(32);
        }
    }
}, {
    sequelize: db,
    modelName: "api-keys"
});

await APIKeys.sync({
    alter: {
        drop: false
    }
});

export { APIKeys };