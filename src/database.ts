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

class APIKey extends Model<InferAttributes<APIKey, { omit: "createdAt" | "updatedAt" }>> {
    declare uuid: string;
    declare key: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

APIKey.init({
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

await APIKey.sync({
    alter: {
        drop: false
    }
});

class Image extends Model<InferAttributes<Image, { omit: "createdAt" | "updatedAt" }>> {
    declare id: string;
    declare server: string;
    declare owner: string | null;
    declare ownerString: string | null;
    declare revokationToken: string | null;
    declare width: number;
    declare height: number;
    declare format: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

Image.init({
    id: {
        type: DataTypes.UUIDV4,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4
    },
    server: {
        type: DataTypes.STRING,
        allowNull: false
    },
    owner: {
        type: DataTypes.STRING,
        allowNull: true,
        references: {
            model: APIKey,
            key: "uuid"
        },
        set(value: string) {
            if (value === null) {
                this.setDataValue("owner", null);
                this.setDataValue("ownerString", null);
            } else {
                this.setDataValue("owner", value);
                this.setDataValue("ownerString", null);
            }
        }
    },
    ownerString: {
        type: DataTypes.STRING,
        allowNull: true
    },
    revokationToken: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: () => {
            return "kona_ri_" + randomStuff(32);
        }
    },
    width: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    height: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    format: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    sequelize: db,
    modelName: "images"
});

await Image.sync({
    alter: {
        drop: false
    }
});

export { APIKey, Image };