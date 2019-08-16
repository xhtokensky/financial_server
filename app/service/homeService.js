'use strict';

const Service = require('egg').Service;
const util = require('util');
const dateUtil = require('../utils/dateUtil');
const commonUtil = require('../utils/commonUtil');
const qiniu = require('../utils/qiniu');
const dbName = 'TokenskyAvatarDB';
const moment = require('moment');
const table = require('./../../config/constant/table');


class HomeService extends Service {


    isExists(data, object) {

        for (let i = 0; i < data.length; i++) {
            if (data[i].symbol == object.symbol) {
                return true;
            }
        }

        return false;

    }

    async findOneFinancialCategory(symbol) {
        return await this.app.mysql.get(dbName).get(table.FINANCIAL_CATEGORY, {symbol: symbol});
    }

    async findOneProductByDead({id}) {
        let sql = `
                     SELECT
                        fc.avatar,
                        fc.symbol,
                        fbc.cycle,
                        fbc.id,
                        fbc.title,
                        fbc.year_profit
                    FROM
                        ${table.FINANCIAL_CATEGORY} fc,
                        ${table.FINANCIAL_PRODUCT} fbc
                    WHERE
                        fc.id = fbc.financial_category_id
                    AND fbc.\`status\` = ?
                    AND fbc.category= ?
                    AND fbc.id = ?
                 `;
        let data = await this.app.mysql.get(dbName).query(sql, [1, 2, id]);
        return data[0] ? data[0] : null;
    }

    async findOneProductByLive({symbol}) {
        let sql = `
                     SELECT
                        fc.avatar,
                        fc.symbol,
                        fbc.cycle,
                        fbc.id,
                        fbc.year_profit
                    FROM
                        ${table.FINANCIAL_CATEGORY} fc,
                        ${table.FINANCIAL_PRODUCT} fbc
                    WHERE
                        fc.id = fbc.financial_category_id
                    AND fbc.\`status\` = ?
                    AND fbc.category= ?
                    AND fc.symbol = ?
                 `;
        let data = await this.app.mysql.get(dbName).query(sql, [1, 1, symbol]);
        return data[0] ? data[0] : null;
    }

    async getProductByDeadList(symbol) {
        let sql = `
                     SELECT
                        fc.avatar,
                        fc.symbol,
                        fbc.cycle,
                        fbc.id,
                        fbc.year_profit
                    FROM
                        ${table.FINANCIAL_CATEGORY} fc,
                        ${table.FINANCIAL_PRODUCT} fbc
                    WHERE
                        fc.id = fbc.financial_category_id
                    AND fbc.\`status\` = ?
                    AND fbc.category= ?
                    AND fc.symbol = ?
                    ORDER BY
                        fbc.cycle ASC
                 `;
        let data = await this.app.mysql.get(dbName).query(sql, [1, 2, symbol]);
        for (let i = 0; i < data.length; i++) {
            //data[i].start_time = moment(moment(moment().add(1, 'day')).format('YYYY-MM-DD')).format('MM-DD HH:mm:ss');
            //data[i].end_time = moment(moment().add(data[i].cycle, 'day').format('YYYY-MM-DD')).format('MM-DD HH:mm:ss');
            data[i].start_time = dateUtil.currentTimestamp(dateUtil.formatBirthday(moment().add(1, 'day')));
            data[i].end_time = dateUtil.currentTimestamp(moment().add(data[i].cycle + 1, 'day').format('YYYY-MM-DD'))
        }
        return data;
    }

    async getUserBalanceBySymbol(userId, symbol) {
        const object = await this.app.mysql.get(dbName).get(table.TOKENSKY_USER_BALANCE, {
            user_id: userId,
            coin_type: symbol
        });
        if (object) {
            let balance = commonUtil.bigNumberMinus(object.balance, object.frozen_balance, 6);
            let coinObject = await this.app.mysql.get(dbName).get(table.TOKENSKY_USER_BALANCE_COIN, {symbol: symbol});
            return {
                avatar: coinObject ? qiniu.getSignAfterUrl(coinObject.avatar, this.app.config.qiniuConfig) : '',
                balance: balance,
                symbol: symbol
            }
        }
        return {
            balance: 0,
            symbol: symbol
        }
    }


    async getTempList() {
        let sql = `
                    SELECT
                        fc.avatar,
                        fc.symbol,
                        fbc.category,
                        fbc.title,
                        fbc.cycle,
                        fbc.sort,
                        fbc.year_profit
                    FROM
                        ${table.FINANCIAL_CATEGORY} fc,
                        ${table.FINANCIAL_PRODUCT} fbc
                    WHERE
                        fc.id = fbc.financial_category_id
                    AND fbc.\`status\` = ?
                    ORDER BY
                        fbc.year_profit asc
                  `;
        let data = await this.app.mysql.get(dbName).query(sql, [1]);

        let livedata = [];
        let deaddata = [];
        for (let i = 0; i < data.length; i++) {
            data[i].avatar = qiniu.getSignAfterUrl(data[i].avatar, this.app.config.qiniuConfig);
            if (data[i].category == 1) {
                livedata.push(data[i]);
            } else if (data[i].category == 2) {
                deaddata.push(data[i]);
            }
        }
        let result = [];
        if (deaddata.length > 1) {

            for (let i = 0; i < deaddata.length; i++) {
                if (!this.isExists(result, deaddata[i])) {
                    result.push(deaddata[i]);
                }
            }
        } else {
            result = deaddata;
        }

        return {
            livedata: livedata,
            deaddata: result
        }
    }

    async getUserBalances(userId, symbol) {
        if (symbol) {
            let sql = `select * from ${table.TOKENSKY_USER_BALANCE} where user_id = ? and coin_type=? `;
            let data = await this.app.mysql.get(dbName).query(sql, [userId, symbol]);
            return data;
        }
        let sql = `select * from ${table.TOKENSKY_USER_BALANCE} where user_id = ? `;
        let data = await this.app.mysql.get(dbName).query(sql, [userId]);
        return data;
    }


    async getOrderBalanceByUserId(userId, symbol) {
        let sql = `
                    SELECT
                        symbol,
                        SUM(quantity_left) balance
                    FROM
                        ${table.FINANCIAL_ORDER}
                    WHERE
                        user_id = ?
                  `;
        if (symbol) {
            sql += ` AND symbol='${symbol}' `
        }
        sql += ` GROUP BY symbol`;
        let data = await this.app.mysql.get(dbName).query(sql, [userId]);
        return data;
    }

    async getProfitByUserId(userId, symbol, category) {
        let sql = `
                    SELECT
                        symbol,
                        sum(profit) balance
                    FROM
                        ${table.FINANCIAL_PROFIT}
                    WHERE
                        user_id = ?`;

        if (symbol) {
            sql += ` AND symbol='${symbol}' `
        }
        if (category) {
            sql += ` AND category= ${category} `;
        }
        sql += ` GROUP BY symbol`;
        let data = await this.app.mysql.get(dbName).query(sql, [userId]);
        return data;
    }

    async getYesterdayProfitByUserId(userId, symbol, category) {
        let t = moment().subtract(1, 'day').format('YYYY-MM-DD');
        let sql = `
                    SELECT
                        symbol,
                        sum(profit) balance
                    FROM
                        ${table.FINANCIAL_PROFIT}
                    WHERE
                        user_id = ?
                    AND DATE_FORMAT(create_time,'%Y-%m-%d')=?    
                  `;
        if (symbol) {
            sql += ` AND symbol='${symbol}' `
        }
        if (category) {
            sql += ` AND category= ${category} `;
        }
        sql += ` GROUP BY symbol`;
        let data = await this.app.mysql.get(dbName).query(sql, [userId, t]);
        return data;
    }


    //获取被质押的数字货币
    async __getBorrowBalance(userId) {
        let sql = `
                    SELECT
                        SUM(pledge_amount) balance,
                        symbol
                    FROM
                        borrow_order
                    WHERE
                        user_id = ?
                    AND (status = ? OR status = ? OR status = ?)
                    GROUP BY
                        symbol
                  `;
        let data = await this.app.mysql.get(dbName).query(sql, [userId, 1, 2, 3]);
        return data;
    }

    //合并数字货币数额
    __mergeData(data, borrowData) {
        for (let i = 0; i < data.length; i++) {
            for (let j = 0; j < borrowData.length; j++) {
                if (!data[i].add && data[i].coin_type == borrowData[j].symbol) {
                    data[i].balance = commonUtil.bigNumberPlus(data[i].balance, borrowData[j].balance, 6);
                    data[i].add = true;
                }
            }
        }
        for (let k = 0; k < data.length; k++) {
            delete data[k].add
        }
        return data;
    }

    async __getLiveData(userId, symbol = null) {
        let data = await this.getUserBalances(userId, symbol);
        let live = {};
        if (data.length == 0) {
            live.balance = 0;
            live.usd = 0;
        } else {
            let borrowData = await this.__getBorrowBalance(userId);
            data = this.__mergeData(data, borrowData);
            let btcBalance = 0;//btc个数
            let USD = 0;//所有的数字货币转化成美金
            let otherUSD = 0;//除BTC外所有的数字货币转化成美金
            let btcUsdPrice = 0;
            for (let i = 0; i < data.length; i++) {
                let balance = data[i].balance;
                let usdPrice = await this.ctx.service.quoteService.findOneQuoteUSDBySymbol(data[i].coin_type);
                if (data[i].coin_type == 'BTC') {
                    btcUsdPrice = usdPrice;
                    btcBalance = commonUtil.bigNumberPlus(btcBalance, balance);
                } else {
                    let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                    otherUSD = commonUtil.bigNumberPlus(otherUSD, coinToprice);
                }
                //所有的货币转美元
                let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                USD = commonUtil.bigNumberPlus(USD, coinToprice);
            }
            if (btcUsdPrice > 0) {
                let otherCoinToBTC = commonUtil.bigNumberDiv(otherUSD, btcUsdPrice, 8);
                btcBalance = commonUtil.bigNumberPlus(btcBalance, otherCoinToBTC);
                btcBalance = btcBalance.toFixed(8);
            }
            live.usd = USD.toFixed(2);
            live.balance = btcBalance;
        }
        return live;
    }

    async __getDeadData(userId, symbol = null) {
        let dead = {};
        let orders = await this.getOrderBalanceByUserId(userId, symbol);
        if (orders.length == 0) {
            dead.balance = 0;
            dead.usd = 0;
        } else {
            let btcBalance = 0;//btc个数
            let USD = 0;//所有的数字货币转化成美金
            let otherUSD = 0;//除BTC外所有的数字货币转化成美金
            let btcUsdPrice = 0;
            for (let i = 0; i < orders.length; i++) {
                let balance = orders[i].balance;
                let usdPrice = await this.ctx.service.quoteService.findOneQuoteUSDBySymbol(orders[i].symbol);
                if (orders[i].symbol == 'BTC') {
                    btcUsdPrice = usdPrice;
                    btcBalance = commonUtil.bigNumberPlus(btcBalance, balance);
                } else {
                    let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                    otherUSD = commonUtil.bigNumberPlus(otherUSD, coinToprice);
                }
                //所有的货币转美元
                let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                USD = commonUtil.bigNumberPlus(USD, coinToprice);
            }
            if (btcUsdPrice > 0) {
                let otherCoinToBTC = commonUtil.bigNumberDiv(otherUSD, btcUsdPrice, 8);
                btcBalance = commonUtil.bigNumberPlus(btcBalance, otherCoinToBTC);
                btcBalance = btcBalance.toFixed(8);
            }
            dead.usd = USD.toFixed(2);
            dead.balance = btcBalance;
        }
        return dead;
    }

    async __getSumProfit(userId, symbol = null, category = null) {
        let sum_profit = 0;
        let profits = await this.getProfitByUserId(userId, symbol, category);
        if (profits.length > 0) {
            let btcBalance = 0;//btc个数
            let USD = 0;//所有的数字货币转化成美金
            let otherUSD = 0;//除BTC外所有的数字货币转化成美金
            let btcUsdPrice = 0;
            for (let i = 0; i < profits.length; i++) {
                let balance = profits[i].balance;
                let usdPrice = await this.ctx.service.quoteService.findOneQuoteUSDBySymbol(profits[i].symbol);
                if (profits[i].symbol == 'BTC') {
                    btcUsdPrice = usdPrice;
                    btcBalance = commonUtil.bigNumberPlus(btcBalance, balance);
                } else {
                    let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                    otherUSD = commonUtil.bigNumberPlus(otherUSD, coinToprice);
                }
            }
            if (btcUsdPrice > 0) {
                let otherCoinToBTC = commonUtil.bigNumberDiv(otherUSD, btcUsdPrice, 8);
                btcBalance = commonUtil.bigNumberPlus(btcBalance, otherCoinToBTC);
                btcBalance = btcBalance.toFixed(8);
            }
            sum_profit = btcBalance;
        }
        return sum_profit;
    }

    async __getYesterdayProfit(userId, symbol = null, category = null) {
        let yesterday_profit = 0;
        let list = await this.getYesterdayProfitByUserId(userId, symbol, category);
        if (list.length > 0) {
            let btcBalance = 0;//btc个数
            let USD = 0;//所有的数字货币转化成美金
            let otherUSD = 0;//除BTC外所有的数字货币转化成美金
            let btcUsdPrice = 0;
            for (let i = 0; i < list.length; i++) {
                let balance = list[i].balance;
                let usdPrice = await this.ctx.service.quoteService.findOneQuoteUSDBySymbol(list[i].symbol);
                if (list[i].symbol == 'BTC') {
                    btcUsdPrice = usdPrice;
                    btcBalance = commonUtil.bigNumberPlus(btcBalance, balance);
                } else {
                    let coinToprice = commonUtil.bigNumberMultipliedBy(balance, usdPrice);
                    otherUSD = commonUtil.bigNumberPlus(otherUSD, coinToprice);
                }
            }
            if (btcUsdPrice > 0) {
                let otherCoinToBTC = commonUtil.bigNumberDiv(otherUSD, btcUsdPrice, 8);
                btcBalance = commonUtil.bigNumberPlus(btcBalance, otherCoinToBTC);
                btcBalance = btcBalance.toFixed(8);
            }
            yesterday_profit = btcBalance;
        }
        return yesterday_profit;
    }

    /**
     * 获取 活期，定期，人民币，累积收益
     * @param userId
     * @returns {Promise<void>}
     */
    async getFinancialBalance(userId, isYesterdayProfit) {

        /**
         * 查询活期数量
         * 将所有货币转化为BTC
         * @type {*}
         */
        let live = await this.__getLiveData(userId);

        /**
         * 查询定期数量
         */
        let dead = await this.__getDeadData(userId);

        /**
         * 累积收益
         */

        let sum_profit = await this.__getSumProfit(userId);

        /**
         * 昨日收益
         */


        let res = {
            live: live,
            dead: dead,
            sum_profit: sum_profit
        };

        if (isYesterdayProfit) {
            let yesterday_profit = await this.__getYesterdayProfit(userId);
            res.yesterday_profit = yesterday_profit;
        }

        return res;
    }


    async getFinancialCategoryList() {
        let data = await this.app.mysql.get(dbName).select(table.FINANCIAL_CATEGORY);
        return data;
    }


    /**
     * 获取定期本金合计
     * @returns {Promise<void>}
     */
    async getDeadPrincipalTotal(userId, symbol) {
        let t = dateUtil.currentTimestamp();
        let sql = `
                    SELECT
                        SUM(quantity_left) quantity
                    FROM
                        ${table.FINANCIAL_ORDER}
                    WHERE
                        user_id = ?
                    AND maturity_time > ?
                    AND symbol = ?
                    AND \`status\` = ?
                  `;
        let data = await this.app.mysql.get(dbName).query(sql, [userId, t, symbol, 1]);
        return data[0].quantity ? data[0].quantity : 0;
    }

    /**
     * 获取活期收益
     * 改币种的昨日活期收益
     */
    async getYesterdayLiveProfit(userId, symbol) {
        let t = moment().subtract(1, 'day').format('YYYY-MM-DD');
        let sql = `
                     SELECT
                        sum(profit) balance
                    FROM
                        ${table.FINANCIAL_PROFIT}
                    WHERE
                        user_id = ?
                    AND symbol = ?   
                    AND DATE_FORMAT(create_time,'%Y-%m-%d')=?    
                  `;
        let data = await this.app.mysql.get(dbName).query(sql, [userId, symbol, t]);
        return data[0].balance ? data[0].balance : 0;
    }

    /**
     *获取定期预计收益
     */
    async getDeadExpectProfit(userId, symbol) {
        let num = 0;
        let t = dateUtil.currentTimestamp();
        let sql = `
                    SELECT
                        quantity_left as quantity,
                        year_profit,
                        cycle
                    FROM
                        ${table.FINANCIAL_ORDER}
                    WHERE
                        user_id = ?
                    AND maturity_time > ?
                    AND symbol = ?
                    AND \`status\` = ?
                  `;
        let data = await this.app.mysql.get(dbName).query(sql, [userId, t, symbol, 1]);
        if (data.length == 0) {
            return num;
        }
        for (let i = 0; i < data.length; i++) {
            let quantity = data[i].quantity;
            let year_profit = data[i].year_profit;
            let cycle = data[i].cycle;
            let profit = year_profit / 365 * cycle * quantity;
            num += profit;
        }
        return num.toFixed(6);
    }

    /**
     * 获取理财资产中的收益记录
     * @param userId
     * @returns {Promise<*>}
     */
    async getProfitList(userId) {

        let sql = `SELECT DISTINCT(symbol) as symbol,avatar from ${table.FINANCIAL_CATEGORY} fc,${table.FINANCIAL_PRODUCT} fp where fc.id = fp.financial_category_id`;
        let data = await this.app.mysql.get(dbName).query(sql);

        //let data = await this.getFinancialCategoryList();

        for (let i = 0; i < data.length; i++) {
            data[i].avatar = qiniu.getSignAfterUrl(data[i].avatar, this.app.config.qiniuConfig);
            data[i].dead_principal_total = await this.getDeadPrincipalTotal(userId, data[i].symbol) || 0;
            data[i].yesterday_live_profit = await this.getYesterdayLiveProfit(userId, data[i].symbol) || 0;
            data[i].dead_expect_profit = await this.getDeadExpectProfit(userId, data[i].symbol) || 0;
        }

        return data;
    }

    async getSingleLiveBalance(userId, symbol) {
        let live = await this.__getLiveData(userId, symbol);

        let sum_profit = await this.__getSumProfit(userId, symbol, 1);

        let yesterday_profit = await this.__getYesterdayProfit(userId, symbol, 1);

        let res = {
            live: live,
            sum_profit: sum_profit,
            yesterday_profit: yesterday_profit
        };

        return res;
    }

    async getFinancialProfitList({pageIndex, pageSize}, condition) {
        const results = await this.app.mysql.get(dbName).select(table.FINANCIAL_PROFIT, {
            where: condition,
            orders: [['create_time', 'desc']], // 排序方式
            columns: ['symbol', 'profit', 'is_date'],
            limit: pageSize, // 返回数据量
            offset: pageIndex, // 数据偏移量
        });
        return results;
    }


    async getSingleDeadBalance(userId, symbol) {
        let dead = await this.__getDeadData(userId, symbol);
        let yesterday_profit = await this.__getYesterdayProfit(userId, symbol, 2);
        let expect_profit = await this.getDeadExpectProfit(userId, symbol);
        let res = {
            dead: dead,
            yesterday_profit: yesterday_profit,
            expect_profit: expect_profit
        };
        return res;
    }


}


module.exports = HomeService;
