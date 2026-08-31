const { createBadRequestError } = require("./index");

const buildAdjacencyMap = (actions) => {
  const map = new Map();

  for (const action of actions) {
    map.set(action.id, action.prerequisiteActionId || null);
  }

  return map;
};

const hasCircularDependency = (actions) => {
  const prerequisites = buildAdjacencyMap(actions);

  const visit = (actionId, visiting, visited) => {
    if (visited.has(actionId)) {
      return false;
    }

    if (visiting.has(actionId)) {
      return true;
    }

    visiting.add(actionId);

    const prerequisiteId = prerequisites.get(actionId);
    if (prerequisiteId) {
      if (visit(prerequisiteId, visiting, visited)) {
        return true;
      }
    }

    visiting.delete(actionId);
    visited.add(actionId);
    return false;
  };

  for (const actionId of prerequisites.keys()) {
    if (visit(actionId, new Set(), new Set())) {
      return true;
    }
  }

  return false;
};

const validateNoCircularDependencies = (actions) => {
  if (hasCircularDependency(actions)) {
    createBadRequestError("وابستگی دایره‌ای بین اقدامات مجاز نیست", 400);
  }
};

const validatePrerequisiteOwnership = (
  prerequisiteActionId,
  planId,
  actions,
  currentActionId = null,
) => {
  if (!prerequisiteActionId) {
    return;
  }

  if (currentActionId && prerequisiteActionId === currentActionId) {
    createBadRequestError("اقدام نمی‌تواند پیش‌نیاز خودش باشد", 400);
  }

  const prerequisite = actions.find((action) => action.id === prerequisiteActionId);

  if (!prerequisite) {
    createBadRequestError("پیش‌نیاز انتخاب‌شده معتبر نیست", 400);
  }

  if (prerequisite.planId !== planId) {
    createBadRequestError("پیش‌نیاز باید متعلق به همین برنامه باشد", 400);
  }
};

const validateOrderValues = (actions) => {
  if (!actions.length) {
    createBadRequestError("برنامه باید حداقل یک اقدام داشته باشد", 400);
  }

  const orders = actions.map((action) => action.order);

  if (orders.some((order) => !Number.isInteger(order) || order < 1)) {
    createBadRequestError("ترتیب اقدامات باید عدد صحیح مثبت باشد", 400);
  }

  const uniqueOrders = new Set(orders);
  if (uniqueOrders.size !== orders.length) {
    createBadRequestError("ترتیب اقدامات باید یکتا باشد", 400);
  }
};

module.exports = {
  hasCircularDependency,
  validateNoCircularDependencies,
  validatePrerequisiteOwnership,
  validateOrderValues,
};
