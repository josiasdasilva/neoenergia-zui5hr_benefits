sap.ui.define(function () {
	"use strict";

	var Formatter = {

		converter: function (sVal) {
			jQuery.sap.require("sap.ui.core.format.NumberFormat");

			var val = parseFloat(sVal).toFixed(2);

			var oNumberFormat = sap.ui.core.format.NumberFormat.getFloatInstance({
				maxFractionDigits: 2,
				groupingEnabled: true,
				groupingSeparator: ".",
				decimalSeparator: ","
			});

			return oNumberFormat.format(val);
		},
		float2digStr: function (sValue) {
			var number = new Intl.NumberFormat("pt-BR", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			});
			if (sValue.indexOf(',') > 0) {
				sValue = parseFloat(sValue.replace(/\./g, '').replace(',', '.'));
			} 
			if ((!sValue) || (sValue === 0)) {
				return "";
			}
			return number.format(sValue).toString();
		},
		membro: function (type) {
			switch (type) {
			case "1":
				return "Cônjuge";
			case "13":
				return "Companheiro/a";
			case "5":
				return "Tutor";
			case "2":
				return "Filho";
			case "6":
				return "Enteado";
			case "90":
				return "Sob guarda judicial";
			case "":
				return "";
			}
			return type;
		},

		statusPlano: function (type) {
			switch (type) {
			case "INS":
				return "Inclusão";
			case "DEL":
				return "Exclusão";
			case "MOD":
				return "Modificação";
			case "":
				return "";
			}
			return type;
		},

		dataAdmissao: function (value) {
			if (value) {
				value = value.substring(8, 10) + "." + value.substring(5, 7) + "." + value.substring(0, 4);
				return value;
			} else {
				return value;
			}
		}

	};

	return Formatter;
}, true);