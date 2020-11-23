sap.ui.core.mvc.Controller.extend("cadastralMaintenance.view.Master", {

	onInit: function () {

		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		var oEventBus = this.getEventBus();

		this.getView().byId("master1List").attachEventOnce("updateFinished", function () {
			this.oInitialLoadFinishedDeferred.resolve();
			oEventBus.publish("Master", "InitialLoadFinished", {
				oListItem: this.getView().byId("master1List").getItems()[0]
			});
			this.getRouter().detachRoutePatternMatched(this.onRouteMatched, this);
		}, this);

		this.fSetHeader();

		// //On phone devices, there is nothing to select from the list. There is no need to attach events.
		if (sap.ui.Device.system.phone) {
			return;
		}

		this.getRouter().attachRoutePatternMatched(this.onRouteMatched, this);
		oEventBus.subscribe("Master2", "NotFound", this.onNotFound, this);
		sap.ui.getCore().getConfiguration().setLanguage("pt-BR");

	},

	//	--------------------------------------------
	//	fSetHeader
	//	--------------------------------------------
	fSetHeader: function () {
		var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
		var urlParam;
		var that = this;

		var oStartupParameters = jQuery.sap.getUriParameters().mParams;
		var sReq = '',
			sPernr = '',
			sProfile = '';

		function fSuccessExecutar(oEvent) {
			var oValue = new sap.ui.model.json.JSONModel(oEvent.results[0].EX_EMPLOYEE_HEADER);
			oValue.oData.PERNR = oEvent.results[0].IM_PERNR;
			sap.ui.getCore().setModel(oValue, "ET_HEADER");

			var oValue2 = new sap.ui.model.json.JSONModel(oEvent.results[0].INIT_TO_BLOCK);
			sap.ui.getCore().setModel(oValue2, "ET_VALID_BLOCK");

			for (var i = 0; i < oValue2.oData.results.length; i++) {

				if (sProfile === "EM") {
					if (oValue2.oData.results[i].BLOCK_TYPE == "113" ||
						oValue2.oData.results[i].BLOCK_TYPE == "114" ||
						oValue2.oData.results[i].BLOCK_TYPE == "115" ||
						oValue2.oData.results[i].BLOCK_TYPE == "116" ||
						oValue2.oData.results[i].BLOCK_TYPE == "117" ||
						oValue2.oData.results[i].BLOCK_TYPE == "121" ||
						oValue2.oData.results[i].BLOCK_TYPE == "122" ||
						oValue2.oData.results[i].BLOCK_TYPE == "123" ||
						oValue2.oData.results[i].BLOCK_TYPE == "124" ||
						oValue2.oData.results[i].BLOCK_TYPE == "125" ||
						oValue2.oData.results[i].BLOCK_TYPE == "126" ||
						oValue2.oData.results[i].BLOCK_TYPE == "127" ||
						oValue2.oData.results[i].BLOCK_TYPE == "128") {

						that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
					}

				}
				if (sProfile === "RH" || sProfile === "ADM") {
					that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
				}
				if ((sProfile === "SSMA") && (oValue2.oData.results[i].BLOCK_TYPE === "110" || oValue2.oData.results[i].BLOCK_TYPE === "107")) {
					that.fSetBlock(oValue2.oData.results[i].BLOCK_TYPE);
				}
				// 113	Vale transporte
				// 114	Plano Saúde
				// 115  Seguro de Vida
				// 116  Vale Refeição
				// 117  Auxílio Saúde
				// 121  Emprestimo Emergencial
				// 122  Financiamento de Veículos
				// 123  Empréstimo Consignado
				// 124  Previdência Privada
				// 128  Plano Odonto

			}

		}

		function fErrorExecutar(oEvent) {
			console.log("An error occured while reading ET_INIT_MASTER!");
		}

		if (oStartupParameters.IM_REQUISITION_ID) {
			sReq = oStartupParameters.IM_REQUISITION_ID[0];
		}

		if (oStartupParameters.IM_PERNR) {
			sPernr = oStartupParameters.IM_PERNR[0];
		}

		if (oStartupParameters.IM_PROFILE) {
			sProfile = oStartupParameters.IM_PROFILE[0];
		}

		urlParam = "$expand=INIT_TO_BLOCK";

		oModel.read("ET_INIT_MASTER?$filter=IM_PERNR eq'" + sPernr + "' and IM_REQUISITION_ID eq'" + sReq + "' ", null, urlParam, false,
			fSuccessExecutar, fErrorExecutar);
	},

	fGetAllowance: function () {

	},

	//	--------------------------------------------
	//	fSetBlock
	//	--------------------------------------------			
	fSetBlock: function (blockName) {

		var oListItem = this.getView().byId(blockName);
		oListItem.setVisible(true);

	},

	onRouteMatched: function (oEvent) {
		var sName = oEvent.getParameter("name");

		if (sName !== "main") {
			return;
		}

		var oStartupParameters = jQuery.sap.getUriParameters().mParams;
		var sReq = '';

		if (oStartupParameters.IM_REQUISITION_ID) {
			sReq = oStartupParameters.IM_REQUISITION_ID[0];
		}

		var sDetail = "cadastralMaintenance.view.Welcome";

		if (sReq) {

			var oValidBlock = sap.ui.getCore().getModel("ET_VALID_BLOCK");

			switch (oValidBlock.oData.results[0].BLOCK_TYPE) {
			case "112":
				sDetail = "cadastralMaintenance.view.DetailStability";
				break;
			case "113":
				sDetail = "cadastralMaintenance.view.DetailTranspVoucher";
				break;
			case "114":
				sDetail = "cadastralMaintenance.view.DetailHealth";
				break;
			case "115":
				sDetail = "cadastralMaintenance.view.DetailLifeInsurance";
				break;
			case "116":
				sDetail = "cadastralMaintenance.view.DetailMealAllowance";
				break;
			case "117":
				sDetail = "cadastralMaintenance.view.DetailHealthAid";
				break;
			case "119":
				sDetail = "cadastralMaintenance.view.DetailShuttle";
				break;
			case "121":
				sDetail = "cadastralMaintenance.view.DetailEmergencyLoan";
				break;
			case "122":
				sDetail = "cadastralMaintenance.view.DetailVehicleFinan";
				break;
			case "123":
				sDetail = "cadastralMaintenance.view.DetailPayrollLoan";
				break;
			case "124":
				sDetail = "cadastralMaintenance.view.DetailPrivatePension";
				break;
			case "125":
				sDetail = "cadastralMaintenance.view.DetailHealthAidDep";
				break;
			case "126":
				sDetail = "cadastralMaintenance.view.DetailEduIncentive";
				break;
			case "127":
				sDetail = "cadastralMaintenance.view.DetailDepAid";
				break;
			case "128":
				sDetail = "cadastralMaintenance.view.DetailDental";
				break;

			}

		}
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: sDetail,
			targetViewType: "XML"
		});
	},

	waitForInitialListLoading: function (fnToExecute) {
		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(fnToExecute, this));
	},

	onNotFound: function () {
		this.getView().byId("master1List").removeSelections();
	},

	//	--------------------------------------------
	//	fSetMockData
	//	--------------------------------------------		
	fSetMockData: function (that, mockPath) {
		//Create contens (on test purpose) and bind it to table
		var oTable = that.getView().byId("tRequisition");
		var oRowModel = new sap.ui.model.json.JSONModel("model/mockRequisitionTableManager.json");

		oTable.setModel(oRowModel);
		oTable.bindRows(mockPath);
	},

	onSearch: function () {
		// Add search filter
		var filters = [];
		var searchString = this.getView().byId("master1SearchField").getValue();
		if (searchString && searchString.length > 0) {
			filters = [new sap.ui.model.Filter("", sap.ui.model.FilterOperator.Contains, searchString)];
		}

		// Update list binding
		this.getView().byId("master1List").getBinding("items").filter(filters);
	},

	onSelect: function (oEvent) {
		// Get the list item either from the listItem parameter or from the event's
		// source itself (will depend on the device-dependent mode)
		oEvent.getParameter("listItem").firePress();
	},

	showDetail: function (oItem, view) {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "cadastralMaintenance.view." + view,
			targetViewType: "XML",
			transition: "slide"
		});

	},

	//	--------------------------------------------------------------------------
	//								onPress Event
	//  Get the list item either from the listItem parameter or from the event's
	//  source itself (will depend on the device-dependent mode)
	//	--------------------------------------------------------------------------
	onPressVT: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailTranspVoucher");
	},

	onPressBenefit: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailBenefits");
	},

	onPressHealth: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailHealth");
	},

	onPressDental: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailDental");
	},

	onPressLifeInsurance: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailLifeInsurance");
	},

	onPressMealAllowance: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailMealAllowance");
	},

	onPressHealthAid: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailHealthAid");
	},

	onPressRentalAllowance: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailRentalAllowance");
	},

	onPressSportAssociation: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailSportAssociation");
	},

	onPressShuttle: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailShuttle");
	},
	onPressEmergencyLoan: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailEmergencyLoan");
	},

	onPressCooperative: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailCooperative");
	},

	onPressVehicleFinan: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailVehicleFinan");
	},

	onPressPayrollLoan: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailPayrollLoan");
	},

	onPressPrivatePension: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailPrivatePension");
	},
	onPressHealthAidDep: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailHealthAidDep");
	},
	onPressEduIncentive: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailEduIncentive");
	},
	onPressDepAid: function (oEvent) {
		this.showDetail(oEvent.getParameter("listItem") || oEvent.getSource(), "DetailDepAid");
	},

	getEventBus: function () {
		return sap.ui.getCore().getEventBus();
	},

	getRouter: function () {
		return sap.ui.core.UIComponent.getRouterFor(this);
	},

	onExit: function (oEvent) {
		this.getEventBus().unsubscribe("Master2", "NotFound", this.onNotFound, this);
	}
});