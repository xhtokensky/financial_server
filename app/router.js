'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {

    const isAuthenticated = app.middleware.isAuthenticated();


    const {router, controller} = app;

    router.post('/financial/getHomeData', isAuthenticated, controller.home.getHomeData);//获取首页数据

    router.post('/financial/getFinancialAssetsData', isAuthenticated, controller.home.getFinancialAssetsData);//理财资产数据

    router.post('/financial/getBuyDetails', isAuthenticated, controller.home.getBuyDetails);//获取购买详情数据

    router.post('/financial/getSingleLiveBalance', isAuthenticated, controller.home.getSingleLiveBalance);//获取活期单币balance

    router.post('/financial/getSingleLiveProfitList', isAuthenticated, controller.home.getSingleLiveProfitList);//获取活期单币收益列表

    router.post('/financial/getSingleDeadBalance', isAuthenticated, controller.home.getSingleDeadBalance);//获取定期单币balance

    router.post('/financial/getSingleDeadOrderList', isAuthenticated, controller.order.getOrderList);//获取定期单币订单列表

    router.post('/financial/getOrderDetails', controller.order.getOrderDetails);//获取订单详情

    router.post('/financial/buyOrder', isAuthenticated, controller.order.buyOrder);//下单

    router.post('/financial/withdrawal', isAuthenticated, controller.order.withdrawal);//提前取款

    router.post('/financial/calculationWithdrawal', isAuthenticated, controller.order.calculationWithdrawal);//提前取款计算


};
