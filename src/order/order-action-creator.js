import { Observable } from 'rxjs/Observable';
import { createAction, createErrorAction } from '@bigcommerce/data-store';
import { CartComparator } from '../cart';
import { CartChangedError } from '../cart/errors';
import * as actionTypes from './order-action-types';

export default class OrderActionCreator {
    /**
     * @constructor
     * @param {CheckoutClient} checkoutClient
     */
    constructor(checkoutClient) {
        this._checkoutClient = checkoutClient;
        this._cartComparator = new CartComparator();
    }

    /**
     * @param {number} orderId
     * @param {RequestOptions} [options]
     * @return {Observable<Action>}
     */
    loadOrder(orderId, options) {
        return Observable.create((observer) => {
            observer.next(createAction(actionTypes.LOAD_ORDER_REQUESTED));

            this._checkoutClient.loadOrder(orderId, options)
                .then(({ body: { data } = {} }) => {
                    observer.next(createAction(actionTypes.LOAD_ORDER_SUCCEEDED, data));
                    observer.complete();
                })
                .catch(response => {
                    observer.error(createErrorAction(actionTypes.LOAD_ORDER_FAILED, response));
                });
        });
    }

    /**
     * @param {OrderRequestBody} payload
     * @param {InternalCart} [cart]
     * @param {RequestOptions} [options]
     * @return {Observable<Action>}
     */
    submitOrder(payload, cart, options) {
        return Observable.create((observer) => {
            observer.next(createAction(actionTypes.SUBMIT_ORDER_REQUESTED));

            this._verifyCart(cart, options)
                .then(() => this._checkoutClient.submitOrder(payload, options))
                .then(({ body: { data, meta } = {}, headers: { token } = {} }) => {
                    observer.next(createAction(actionTypes.SUBMIT_ORDER_SUCCEEDED, data, { ...meta, token }));
                    observer.complete();
                })
                .catch(response => {
                    observer.error(createErrorAction(actionTypes.SUBMIT_ORDER_FAILED, response));
                });
        });
    }

    /**
     * @param {number} orderId
     * @param {RequestOptions} [options]
     * @return {Observable<Action>}
     */
    finalizeOrder(orderId, options) {
        return Observable.create((observer) => {
            observer.next(createAction(actionTypes.FINALIZE_ORDER_REQUESTED));

            this._checkoutClient.finalizeOrder(orderId, options)
                .then(({ body: { data } = {} }) => {
                    observer.next(createAction(actionTypes.FINALIZE_ORDER_SUCCEEDED, data));
                    observer.complete();
                })
                .catch(response => {
                    observer.error(createErrorAction(actionTypes.FINALIZE_ORDER_FAILED, response));
                });
        });
    }

    /**
     * @private
     * @param {InternalCart} [existingCart]
     * @param {RequestOptions} [options]
     * @return {Promise<boolean>}
     */
    _verifyCart(existingCart, options) {
        if (!existingCart) {
            return Promise.resolve(true);
        }

        return this._checkoutClient.loadCart(options)
            .then(({ body: { data } = {} }) =>
                this._cartComparator.isEqual(existingCart, data.cart) ? true : Promise.reject(false)
            )
            .catch(() => Promise.reject(new CartChangedError()));
    }
}