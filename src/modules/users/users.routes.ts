import { Router } from "express";
import { zodValidate } from "../../framework/middleware/zodValidate.js";
import { zodValidateQuery } from "../../framework/middleware/zodValidateQuery.js";
import { zodValidateParams } from "../../framework/middleware/zodValidateParams.js";
import {
    listUsersQuerySchema,
    userIdParamsSchema,
    updateUserSchema,
} from "./users.validator.js";

import { usersController } from "./users.controller.js";

const usersRoutes = Router();

usersRoutes.get(
    "/",
    zodValidateQuery(listUsersQuerySchema),
    usersController.list,
);

usersRoutes.get(
    "/:id",
    zodValidateParams(userIdParamsSchema),
    usersController.getById,
);

usersRoutes.patch(
    "/:id",
    zodValidateParams(userIdParamsSchema),
    zodValidate(updateUserSchema),
    usersController.update,
);

usersRoutes.delete(
    "/:id",
    zodValidateParams(userIdParamsSchema),
    usersController.remove,
);

export default usersRoutes;