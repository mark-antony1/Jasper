"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var prisma_lib_1 = require("prisma-client-lib");
var typeDefs = require("./prisma-schema").typeDefs;

var models = [
  {
    name: "User",
    embedded: false
  },
  {
    name: "MenuItem",
    embedded: false
  },
  {
    name: "Location",
    embedded: false
  },
  {
    name: "Order",
    embedded: false
  },
  {
    name: "Transaction",
    embedded: false
  },
  {
    name: "MenuCategory",
    embedded: false
  },
  {
    name: "Ingredient",
    embedded: false
  },
  {
    name: "MealStatus",
    embedded: false
  },
  {
    name: "IngredientStatus",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `https://us1.prisma.sh/jeffrey-emerich-christian-202db1/j-world/dev`
});
exports.prisma = new exports.Prisma();
