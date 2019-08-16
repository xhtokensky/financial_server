'use strict';

const Service = require('egg').Service;
const util = require('util');
const dateUtil = require('../utils/dateUtil');
const requestHttp = require('../utils/requestHttp');
const commonUtil = require('../utils/commonUtil');
const dbName = 'TokenskyAvatarDB';
const table = require('./../../config/constant/table');
const moment = require('moment');


class OrderService extends Service {

    async buyOrder(params) {
        const conn = await this.app.mysql.get(dbName).beginTransaction(); // 初始化事务

        try {

            let order_id = params.order_id;
            let user_id = params.user_id;
            let symbol = params.symbol;
            let year_profit = params.year_profit;
            let quantity = params.quantity;
            let quantity_left = params.quantity;
            let cycle = params.cycle;
            let buy_time = dateUtil.currentTimestamp();
            let effective_time = dateUtil.currentTimestamp(moment().add(1, 'day').format('YYYY-MM-DD'));
            let maturity_time = dateUtil.currentTimestamp(moment(effective_time).add(cycle, 'day').format('YYYY-MM-DD'));
            let product_id = params.id;

            //新增订单
            let orderParams = {
                order_id: order_id,
                user_id: user_id,
                symbol: symbol,
                year_profit: year_profit,
                quantity: quantity,
                quantity_left: quantity_left,
                buy_time: buy_time,
                effective_time: effective_time,
                maturity_time: maturity_time,
                cycle: cycle,
                product_id: product_id
            };

            let orderResult = await conn.insert(table.FINANCIAL_ORDER, orderParams);
            if (orderResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            //检查orderid是否被使用过
            let _oid = await conn.get(table.TOKENSKY_ORDER_IDS, {order_id: order_id});
            if (_oid) {
                this.ctx.logger.error(`addOtcOrder error:order_id已存在;order_id=${order_id},_oid:`, _oid);
                await conn.rollback();
                return false;
            }
            let orderidsResult = await conn.insert(table.TOKENSKY_ORDER_IDS, {order_id: order_id});
            if (orderidsResult.affectedRows == 0) {
                await conn.rollback();
                return false;
            }


            //修改用户资产
            let assetsParams = {
                change: {
                    uid: user_id,
                    methodBalance: 'sub',
                    balance: quantity,
                    symbol: symbol,
                    signId: order_id
                },
                mold: 'financialOrder',
                cont: '理财定期订单'
            };
            let assetsResult = await requestHttp.postAssets.call(this, assetsParams);
            if (!assetsResult.success) {
                await conn.rollback();
                return false;
            }
            let hashId = assetsResult.hashId;

            let hashSql = `update ${table.TOKENSKY_USER_BALANCE_HASH} set model_status=? where hash_id=? `;
            let hashResult = await conn.query(hashSql, [1, hashId]);
            if (hashResult.affectedRows == 0) {
                this.ctx.logger.error(`tibi update hash fail:hashId==${hashId},userId=${user_id}`);
            }


            await conn.commit();
            return orderResult.insertId;


        } catch (e) {
            await conn.rollback();
            throw e;
            this.ctx.logger.error(`buyOrder service error : ${e.message}`);
            return false;
        }


    }


    async withdrawal(params) {

        const conn = await this.app.mysql.get(dbName).beginTransaction(); // 初始化事务
        try {
            let id = params.id;
            let quantity = params.quantity;
            let effective_time = params.effective_time;
            let year_profit = params.year_profit;
            let product_id = params.product_id;
            let user_id = params.user_id;
            let symbol = params.symbol;

            let withdrawalId = '';

            //计算利息放入账户
            let t = moment().format('YYYY-MM-DD');
            let end = moment(t).valueOf();

            let profit = 0;

            let t2 = moment(effective_time).add(2, 'day').format('YYYY-MM-DD');
            let start = moment(t2).valueOf();
            //天数大于0的话就  计算利息并发放
            let cycle = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            if (cycle > 0) {
                profit = year_profit / 365 * cycle * quantity;
                profit = parseFloat(profit.toFixed(6));

                //新增取出记录
                let withdrawalParams = {
                    order_id: id,
                    quantity: quantity,
                    profit: profit,
                    year_profit: year_profit,
                    withdrawal_time: dateUtil.currentTimestamp()
                };

                let withdrawalResult = await conn.insert(table.FINANCIAL_ORDER_WITHDRAWAL, withdrawalParams);
                if (withdrawalResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }

                withdrawalId = withdrawalResult.insertId;

                //新增收益记录
                let profitParams = {
                    product_id: product_id,
                    relevance_id: withdrawalId,
                    user_id: user_id,
                    category: 1,
                    product: 'withdrawal',
                    symbol: symbol,
                    balance: quantity,
                    year_profit: year_profit,
                    profit: profit,
                    is_date: dateUtil.formatBirthday(new Date()),
                    create_time: dateUtil.currentDate(),
                    status: 1,
                    pay_balance: 0
                };
                let productResult = await conn.insert(table.FINANCIAL_PROFIT, profitParams);
                if (productResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }
                //新增交易记录
                let tranParams = {
                    coin_type: symbol,
                    tran_type: '活期收益',
                    category: 1,
                    user_id: user_id,
                    push_time: dateUtil.currentDate(),
                    money: profit,
                    status: 1,
                    relevance_category: "financialWithdrawalProfit",
                    relevance_id: withdrawalId
                };

                let tranResult = await conn.insert(table.TOKENSKY_TRANSACTION_RECORD, tranParams);
                if (tranResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }

            } else {
                //新增取出记录
                let withdrawalParams = {
                    order_id: id,
                    quantity: quantity,
                    year_profit: year_profit,
                    profit: profit,
                    withdrawal_time: dateUtil.currentTimestamp()
                };

                let withdrawalResult = await conn.insert(table.FINANCIAL_ORDER_WITHDRAWAL, withdrawalParams);
                if (withdrawalResult.affectedRows == 0) {
                    await conn.rollback();
                    return false;
                }
                withdrawalId = withdrawalResult.insertId;
            }

            //修改订单剩余数量
            let orderSql = `update ${table.FINANCIAL_ORDER} set quantity_left = quantity_left-? where id=? and quantity_left>=? `;
            let orderR = await conn.query(orderSql, [quantity, id, quantity]);
            if (orderR.affectedRows == 0) {
                await conn.rollback();
                return false;
            }

            //修改账户资金
            let balance = commonUtil.bigNumberPlus(profit, quantity, 6);


            //修改用户资产
            let assetsParams = {
                change: {
                    uid: user_id,
                    methodBalance: 'add',
                    balance: balance,
                    symbol: symbol,
                    signId: withdrawalId
                },
                mold: 'financialWithdrawal',
                cont: '理财提前取出'
            };
            let assetsResult = await requestHttp.postAssets.call(this, assetsParams);
            if (!assetsResult.success) {
                await conn.rollback();
                return false;
            }
            let hashId = assetsResult.hashId;

            let hashSql = `update ${table.TOKENSKY_USER_BALANCE_HASH} set model_status=? where hash_id=? `;
            let hashResult = await conn.query(hashSql, [1, hashId]);
            if (hashResult.affectedRows == 0) {
                this.ctx.logger.error(`tibi update hash fail:hashId==${hashId},userId=${user_id}`);
            }

            await conn.commit();
            return true;

        } catch (e) {
            await conn.rollback();
            throw e;
            this.ctx.logger.error(`withdrawal service error : ${e.message}`);
            return false;
        }
    }


    async getOrder({symbol, user_id, pageIndex, pageSize}) {
        let sql = `
                    select o.*,p.title from ${table.FINANCIAL_ORDER} o,${table.FINANCIAL_PRODUCT} p where o.product_id=p.id and o.symbol=? and o.user_id=? and o.quantity_left>? order by o.create_time desc limit ${pageIndex},${pageSize}
                  `;
        let data = await  this.app.mysql.get(dbName).query(sql, [symbol, user_id, 0, pageIndex, pageSize]);
        return data;
    }

    async findOneOrder(condition) {
        return await this.app.mysql.get(dbName).get(table.FINANCIAL_ORDER, condition);
    }


    async isMortgageToBorrow(userId, symbol, id) {
        let condition = {
            user_id: userId,
            symbol: symbol,
            pledge_way: 2
        };
        let isMor = false;
        const result = await this.app.mysql.get(dbName).select(table.BORROW_ORDER, {
            where: condition
        });
        if (result.length == 0) {
            return isMor;//没有被抵押
        }
        for (let i = 0; i < result.length; i++) {
            if (result[i].relevance_id) {
                let relevanceids = result[i].relevance_id.split(',');
                for (let j = 0; j < relevanceids.length; j++) {
                    if (relevanceids[j] == id) {
                        if (result[i].relev_status == 1) {
                            isMor = true;
                            break;
                        }
                    }
                }
            }
        }
        return isMor;
    }


}


module.exports = OrderService;
