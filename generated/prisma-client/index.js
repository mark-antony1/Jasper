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
    name: "Option",
    embedded: false
  },
  {
    name: "OptionValue",
    embedded: false
  },
  {
    name: "MealStatus",
    embedded: false
  }
];
exports.Prisma = prisma_lib_1.makePrismaClientClass({
  typeDefs,
  models,
  endpoint: `http://localhost:4466`
});
exports.prisma = new exports.Prisma();
