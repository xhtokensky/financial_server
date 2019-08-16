module.exports = {
    buyOrder: {
        symbol: {type: 'string', required: true, allowEmpty: false},
        id: {type: 'number', required: true, allowEmpty: false},
        quantity: {type: 'number', required: true, allowEmpty: false},
        transactionPassword: {type: 'string', required: true, allowEmpty: false}
    },
    getOrderList: {
        symbol: {type: 'string', required: true, allowEmpty: false}
    },
    getOrderDetails: {
        id: {type: 'number', required: true, allowEmpty: false}
    },
    withdrawal: {
        id: {type: 'number', required: true, allowEmpty: false},
        quantity: {type: 'number', required: true, allowEmpty: false},
        transactionPassword: {type: 'string', required: true, allowEmpty: false}
    },
    calculationWithdrawal: {
        id: {type: 'number', required: true, allowEmpty: false},
        quantity: {type: 'number', required: true, allowEmpty: false}
    }
};
