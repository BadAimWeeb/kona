import { Sequelize } from "sequelize";

const db = (() => {
    switch (process.env.DATABASE_TYPE) {
        case "SQLITE":
            return new Sequelize({
                dialect: "sqlite",
                storage: process.env.SQLITE_DATABASE_PATH,
            });
        default:
            throw new Error("Unsupported database type");
    }
})();
