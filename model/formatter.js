sap.ui.define([], function () {
	"use strict";

	return {
		float2digStr: function (sValue) {
			var number = new Intl.NumberFormat("pt-BR", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
			if ((!sValue) || (sValue === 0)) {
				return "";
			}
			return number.format(sValue).toString();
		}
	};
});