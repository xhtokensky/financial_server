module.exports = {
    getBuyDetails: {
        symbol: {type: 'string', required: true, allowEmpty: false}
    },
    getSingleLiveBalance:{
        symbol: {type: 'string', required: true, allowEmpty: false}
    },
    getSingleLiveProfitList:{
        symbol: {type: 'string', required: true, allowEmpty: false}
    },
    getSingleDeadBalance:{
        symbol: {type: 'string', required: true, allowEmpty: false}
    }
};
