import { Authorizer } from "@fresh-js/core";

export type ProjectAuthorizers = {
  admin?: Authorizer;
  payer?: Authorizer;
  proposer?: Authorizer;
};
