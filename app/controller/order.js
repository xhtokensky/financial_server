'use strict';
const code = require("./../utils/code");
const commonUtil = require("./../utils/commonUtil");
const dateUtil = require("./../utils/dateUtil");
const I18nConst = require('./../../config/constant/i18n');
const Controller = require('egg').Controller;
const Response = require('../utils/resObj');
const qiniu = require('../utils/qiniu');
const orderRule = require('./rule/order');
const moment = require('moment');


class OrderController extends Controller {


    /**
     * 下单
     * 扣除账户金额
     * 生成交易记录
     * @returns {Promise<Response|Object>}
     */
    async buyOrder() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(orderRule.buyOrder, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let id = body.id;//产品ID
            let symbol = body.symbol;
            let quantity = body.quantity;

            if (quantity <= 0) {
                response.errMsg('require quantity illegal', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let product = await ctx.service.homeService.findOneProductByDead({id: id});
            if (!product) {
                response.errMsg('no such product', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            if (symbol != product.symbol) {
                response.errMsg('require symbol fail', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let cycle = product.cycle;
            if (cycle <= 0) {
                response.errMsg('require cycle fail', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let min_quantity = product.min_quantity;
            if (min_quantity > 0 && quantity < min_quantity) {
                response.errMsg(`最小投资: ${min_quantity} ${symbol}`, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let year_profit = product.year_profit;
            let userBalance = await ctx.service.homeService.getUserBalanceBySymbol(userId, symbol);
            if (userBalance.balance < quantity) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.InsufficientBalance), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            //实名认证
            let real = await ctx.service.userService.verifyRealAuth(userId);
            if (!real.success) {
                response.errMsg(real.message, real.code, real.type);
                return ctx.body = response;
            }
            //交易密码
            const userInfo = await ctx.service.userService.getUserByUid(userId);
            if (!userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.PleaseSetTransactionPassword), code.ERROR_SET_PWD, 'ERROR_SET_PWD');
                return ctx.body = response;
            }

            if (commonUtil.encrypt(commonUtil.decryptTranPWDByClient(body.transactionPassword, userId), userId) != userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.IncorrectPassword), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            let params = {
                order_id: commonUtil.orderId('07'),
                user_id: userId,
                symbol: symbol,
                year_profit: year_profit,
                quantity: quantity,
                quantity_left: quantity,
                cycle: cycle,
                id: id
            };
            let oStatus = await ctx.service.orderService.buyOrder(params);

            if (!oStatus) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError), code.ERROR_ADD_DATA, 'ERROR_ADD_DATA');
                return this.ctx.body = response;
            }
            response.content.id = oStatus;
            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`buyOrder error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }

    async getOrderList() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {

            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(orderRule.getOrderList, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let symbol = body.symbol;

            let index = body.pageIndex || 1;
            let pageSize = body.pageSize ? body.pageSize : 20;
            let pageIndex = (index - 1) * pageSize;
            if (pageSize > 20) {
                pageSize = 20;
            }

            let data = await ctx.service.orderService.getOrder({
                symbol: symbol,
                pageIndex, pageSize,
                user_id: userId
            });

            let result = [];
            if (data.length > 0) {
                let categoryObject = await ctx.service.homeService.findOneFinancialCategory(symbol);
                let avatar = categoryObject ? categoryObject.avatar : '';
                avatar = qiniu.getSignAfterUrl(avatar, this.app.config.qiniuConfig);
                for (let i = 0; i < data.length; i++) {
                    let res = {
                        id: data[i].id,
                        title: data[i].title,
                        cycle: data[i].cycle,
                        symbol: data[i].symbol,
                        avatar: avatar,
                        quantity: data[i].quantity_left,
                    };
                    let quantity_left = data[i].quantity_left;
                    let year_profit = data[i].year_profit;
                    let cycle = data[i].cycle;
                    let profit = year_profit / 365 * cycle * quantity_left;
                    let sum_quantity = commonUtil.bigNumberPlus(res.quantity, profit, 6);
                    res.sum_quantity = sum_quantity;

                    let t = moment().add(2, 'day').format('YYYY-MM-DD');
                    let start = moment(t).valueOf();
                    let d = Math.ceil((data[i].maturity_time - start) / (1000 * 60 * 60 * 24));
                    res.day_left = (d < 0) ? 0 : d;
                    result.push(res);
                }
            }

            response.content = result;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getOrderList error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async getOrderDetails() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(orderRule.getOrderDetails, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let id = body.id;

            let order = await ctx.service.orderService.findOneOrder({id: id});
            if (!order) {
                response.errMsg('no such order', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }
            let product = await this.ctx.service.homeService.findOneProductByLive({symbol: order.symbol});

            if (!product) {
                response.errMsg('no such product', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }


            let t = moment().add(2, 'day').format('YYYY-MM-DD');
            let start = moment(t).valueOf();
            let d = Math.ceil((order.maturity_time - start) / (1000 * 60 * 60 * 24));
            order.day_left = (d < 0) ? 0 : d;//剩余天数

            order.quantity_takeout = commonUtil.bigNumberMinus(order.quantity, order.quantity_left, 6);//取出数量

            let profit = order.year_profit / 365 * order.cycle * order.quantity_left;
            let quantity_maturity = commonUtil.bigNumberPlus(order.quantity_left, profit, 6);//到期取回本息

            order.quantity_maturity = quantity_maturity;


            order.year_profit_live = product.year_profit;


            let productDead = await ctx.service.homeService.findOneProductByDead({id: order.product_id});
            order.title = productDead ? productDead.title : '';
            order.avatar = productDead ? qiniu.getSignAfterUrl(productDead.avatar, this.app.config.qiniuConfig) : '';

            let isMor = await ctx.service.orderService.isMortgageToBorrow(userId, order.symbol, id);
            order.is_mor = isMor;


            //order.buy_time = dateUtil.formatDate(order.buy_time);
            //order.effective_time = dateUtil.formatDate(order.effective_time);
            //order.maturity_time = dateUtil.formatDate(order.maturity_time);

            response.content = order;

            return ctx.body = response;
        } catch (e) {
            this.ctx.logger.error(`getOrderDetails error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    /**
     * 提前取出
     * 1.新增取出记录
     * 2.改变订单剩余数量
     * 3.计算利息放入账户
     * 4.新增收益记录
     * 5.新增交易记录
     * @returns {Promise<Response|Object>}
     */
    async withdrawal() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(orderRule.withdrawal, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }
            let id = body.id;
            let transactionPassword = body.transactionPassword;
            let quantity = body.quantity;

            let order = await ctx.service.orderService.findOneOrder({id: id});
            if (!order) {
                response.errMsg('no such order', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            if (order.quantity_left < quantity) {
                response.errMsg(ctx.I18nMsg(I18nConst.NotWithinTheLimitChangeAmount), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }

            let symbol = order.symbol;

            //实名认证
            let real = await ctx.service.userService.verifyRealAuth(userId);
            if (!real.success) {
                response.errMsg(real.message, real.code, real.type);
                return ctx.body = response;
            }

            //交易密码
            const userInfo = await ctx.service.userService.getUserByUid(userId);
            if (!userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.PleaseSetTransactionPassword), code.ERROR_SET_PWD, 'ERROR_SET_PWD');
                return ctx.body = response;
            }
            if (commonUtil.encrypt(commonUtil.decryptTranPWDByClient(transactionPassword, userId), userId) != userInfo.transaction_password) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.IncorrectPassword), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            let t = moment().add(2, 'day').format('YYYY-MM-DD');
            let start = moment(t).valueOf();
            let d = Math.ceil((order.maturity_time - start) / (1000 * 60 * 60 * 24));
            let day_left = (d < 0) ? 0 : d;//剩余天数
            if (day_left <= 0) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.HasMaturity), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            //是否被质押借贷
            let isMor = await ctx.service.orderService.isMortgageToBorrow(userId, symbol, id);
            if (isMor) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.Borrow), code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            let product = await this.ctx.service.homeService.findOneProductByLive({symbol: symbol});
            if (!product) {
                response.errMsg('no such product', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            let params = {
                quantity: quantity,
                id: id,
                effective_time: order.effective_time,//生效时间
                year_profit: product.year_profit,
                product_id: product.id,
                user_id: userId,
                symbol: symbol
            };

            let oStatus = await ctx.service.orderService.withdrawal(params);
            if (!oStatus) {
                response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError), code.ERROR_ADD_DATA, 'ERROR_ADD_DATA');
                return this.ctx.body = response;
            }

            return ctx.body = response;
        } catch (e) {
            this.ctx.logger.error(`withdrawal error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }

    async calculationWithdrawal() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(orderRule.calculationWithdrawal, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }
            let id = body.id;
            let quantity = body.quantity;
            let order = await ctx.service.orderService.findOneOrder({id: id});
            if (!order) {
                response.errMsg('no such order', code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let symbol = order.symbol;
            if (order.quantity_left < quantity) {
                response.errMsg(ctx.I18nMsg(I18nConst.NotWithinTheLimitChangeAmount), code.ERROR_SYSTEM, 'ERROR_SYSTEM');
                return ctx.body = response;
            }
            let product = await this.ctx.service.homeService.findOneProductByLive({symbol: symbol});
            if (!product) {
                response.errMsg('no such product', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            let res = {
                quantity_left: commonUtil.bigNumberMinus(order.quantity_left, quantity),//剩余本金
            };

            //计算取出部分利息
            let t = moment().format('YYYY-MM-DD');
            let end = moment(t).valueOf();

            let profit_withdrawal = 0;

            let t2 = moment(order.effective_time).add(2, 'day').format('YYYY-MM-DD');
            let start = moment(t2).valueOf();
            //天数大于0的话就  计算利息并发放
            let cycle = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            if (cycle > 0) {
                profit_withdrawal = product.year_profit / 365 * cycle * quantity;
                profit_withdrawal = parseFloat(profit_withdrawal.toFixed(6));
            }
            //取出部分计息
            res.profit_withdrawal = profit_withdrawal;
            //到账本息
            res.quantity_withdrawal = commonUtil.bigNumberPlus(profit_withdrawal, quantity);
            //到期取回本息
            let profit_maturity = order.year_profit / 365 * order.cycle * res.quantity_left;
            res.quantity_maturity = commonUtil.bigNumberPlus(profit_maturity, res.quantity_left, 6);

            response.content = res;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`calculationWithdrawal error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


}


module.exports = OrderController;
