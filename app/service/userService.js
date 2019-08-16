'use strict';

const Service = require('egg').Service;
const util = require('util');
const I18nConst = require('./../../config/constant/i18n');
const dateUtil = require('../utils/dateUtil');
const code = require("./../utils/code");
const dbName = 'TokenskyAvatarDB';
const table = require('./../../config/constant/table');


class UserService extends Service {

    async getUserByUid(userId) {
        let sql = `SELECT yu.*, yut.token
            FROM ${table.TOKENSKY_USER} AS yu
            LEFT JOIN ${table.TOKENSKY_USER_TOKEN} AS yut
            ON yut.user_id=yu.user_id
            WHERE yu.user_id = ?`;
        let userInfo = await this.app.mysql.get(dbName).query(sql, [userId]);
        if (userInfo.length < 1) {
            return null
        }
        return userInfo[0]
    }

    async findOneRoleBlack(balckType, phone) {
        let sql = `select * from ${table.ROLE_BLACK_LIST} where balck_type = ? and phone=? order by end_time desc `;
        let result = await this.app.mysql.get(dbName).query(sql, [balckType, phone]);
        if (result.length < 1) {
            return null;
        }
        return result[0];
    }

    async verifyRealAuth(userId) {

        let object = await this.app.mysql.get(dbName).get(table.TOKENSKY_REAL_AUTH, {user_id: userId, status: 1});
        if (!object) {
            return {
                success: false,
                code: code.ERROR_REAL_AUTH_UN,
                type: 'ERROR_REAL_AUTH_UN',
                msg: this.ctx.I18nMsg(I18nConst.Verify)
            }
        }
        if (!object.name || !object.identity_card || !object.identity_card_picture || !object.identity_card_picture2 || !object.person_picture) {
            return {
                success: false,
                code: code.ERROR_REAL_AUTH_UN,
                type: 'ERROR_REAL_AUTH_UN',
                msg: this.ctx.I18nMsg(I18nConst.Verify)
            }
        }
        return {
            success: true
        }
    }


}


module.exports = UserService;
