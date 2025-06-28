import BaseController from "../BaseController.js";


class PostalCodeController extends BaseController {
    constructor() {
        super();
    }


    async insert(req, res, next) {
        try {

        } catch (error) {
            this.handleError(next, error.message)
        }
    }


}


export default new PostalCodeController();