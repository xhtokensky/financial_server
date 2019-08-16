'use strict';
const code = require("./../utils/code");
const dateUtil = require("./../utils/dateUtil");
const I18nConst = require('./../../config/constant/i18n');
const Controller = require('egg').Controller;
const Response = require('../utils/resObj');
const homeRule = require('./rule/home');

class HomeController extends Controller {

    async getHomeData() {
        const {ctx} = this;
        let response = Response();
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;
            let financialBalanceObject = await ctx.service.homeService.getFinancialBalance(userId);
            let template = await ctx.service.homeService.getTempList();

            response.content.live_data = template.livedata;
            response.content.dead_data = template.deaddata;
            response.content.live_balance = financialBalanceObject.live;
            response.content.dead_balance = financialBalanceObject.dead;
            response.content.sum_profit = financialBalanceObject.sum_profit;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getHomeData error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async getFinancialAssetsData() {
        const {ctx} = this;
        let response = Response();
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid || 1001;

            let financialBalanceObject = await ctx.service.homeService.getFinancialBalance(userId, true);

            let data = await ctx.service.homeService.getProfitList(userId);

            response.content.data = data;
            response.content.live_balance = financialBalanceObject.live;
            response.content.dead_balance = financialBalanceObject.dead;
            response.content.sum_profit = financialBalanceObject.sum_profit;
            response.content.yesterday_profit = financialBalanceObject.yesterday_profit;

            return ctx.body = response;
        } catch (e) {
            this.ctx.logger.error(`getFinancialAssetsData error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async getBuyDetails() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {

            let json = await this.ctx.checkToken();
            let userId = json.uid;


            let RuleErrors = this.ctx.Rulevalidate(homeRule.getBuyDetails, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let symbol = body.symbol;

            let products = await ctx.service.homeService.getProductByDeadList(symbol);

            let userBalance = await ctx.service.homeService.getUserBalanceBySymbol(userId, symbol);

            let product = await this.ctx.service.homeService.findOneProductByLive({symbol: symbol});

            if (!product) {
                response.errMsg('no such product', code.ERROR_PARAMS, 'ERROR_PARAMS');
                return ctx.body = response;
            }

            response.content.balance_avatar = userBalance.avatar;
            response.content.balance = userBalance.balance;
            response.content.year_profit_live = product.year_profit;
            response.content.data = products;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getBuyDetails error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


    async getSingleLiveBalance() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {

            let json = await this.ctx.checkToken();
            let userId = json.uid;


            let RuleErrors = this.ctx.Rulevalidate(homeRule.getSingleLiveBalance, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let symbol = body.symbol;
            let data = await ctx.service.homeService.getSingleLiveBalance(userId, symbol);

            response.content = data;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getSingleLiveBalance error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }

    async getSingleLiveProfitList() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(homeRule.getSingleLiveProfitList, body);
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

            let data = await ctx.service.homeService.getFinancialProfitList({pageIndex, pageSize}, {
                symbol: symbol,
                user_id: userId
            });

            for (let i = 0; i < data.length; i++) {
                data[i].is_date = data[i].is_date ? dateUtil.currentTimestamp(data[i].is_date) : ""
            }

            response.content = data;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getSingleLiveProfitList error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }

    async getSingleDeadBalance() {
        const {ctx} = this;
        let response = Response();
        let body = ctx.request.body;
        try {
            let json = await this.ctx.checkToken();
            let userId = json.uid;

            let RuleErrors = this.ctx.Rulevalidate(homeRule.getSingleDeadBalance, body);
            // 验证参数
            if (RuleErrors != undefined) {
                let errors = RuleErrors[0];
                response.errMsg(this.ctx.I18nMsg(I18nConst.VerifyFailed) + errors.field + " " + errors.message, code.ERROR_PARAMS, 'ERROR_PARAMS');
                return this.ctx.body = response;
            }

            let symbol = body.symbol;

            let data = await ctx.service.homeService.getSingleDeadBalance(userId, symbol);

            response.content = data;

            return ctx.body = response;

        } catch (e) {
            this.ctx.logger.error(`getSingleDeadBalance error:${e.message}`);
            response.errMsg(this.ctx.I18nMsg(I18nConst.SystemError) + e.message, code.ERROR_SYSTEM, 'ERROR_SYSTEM');
            return ctx.body = response;
        }
    }


}

module.exports = HomeController;
