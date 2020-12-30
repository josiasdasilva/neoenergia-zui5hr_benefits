sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "cadastralMaintenance/formatter/Formatter",
  "sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
  "use strict";
  
  return BaseController.extend("cadastralMaintenance.view.DetailPrivatePension", {
    onInit: function () {
      
      this.oInitialLoadFinishedDeferred = jQuery.Deferred();
      
      if (sap.ui.Device.system.phone) {
        //Do not wait for the master2 when in mobile phone resolution
        this.oInitialLoadFinishedDeferred.resolve();
      } else {
        var oEventBus = this.getEventBus();
        // oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
      }
      
      this.initAttachment();
      
      this.getRouter().attachRouteMatched(this.onRouteMatched, this);
      
      this.fSetHeader();
      this.fSetGlobalInformation();
      
      this.fGetBlock();
      this.exclude = false;
      
    },
    
    //	--------------------------------------------
    //	fGetBlock
    //	--------------------------------------------		
    fGetBlock: function () {
      var that = this;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
      
      var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
      
      // var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
      var urlParam = this.fGetUrlBukrs(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, oGlobalData.IM_BUKRS);
      
      function fSuccess(oEvent) {
        
        var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
        
        that.getView().setModel(oValue, "ET_BLOCK");
        
        //Isolates the model
        var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
        that.getView().setModel(oDataOrig, "ET_BLOCK_ORIG");
        
        that.getView().byId("taJust").setValue(oEvent.OBSERVATION);
        
        if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
          that.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
          that.getView().byId("formJustificationSSG").setVisible(true);
        }
        
        // se tem id verificar os anexos
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          
          var filters = [];
          
          filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
          
          that.getView().setModel(oModel, "anexo");
          
          // Update list binding
          // that.getView().byId("upldAttachments").getBinding("items").filter(filters);
        }
        
        if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
          if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
          oEvent.BLOCK.REQUISITION_ID !== "00000000") {
            
            //retornou req do model, mas não tem na url
            if (oGlobalData.IM_REQ_URL == "") {
              MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
            }
          }
        }
        
        that.fSearchHelpPltyp(that, oGlobalData.IM_PERNR);
        that.fSearchHelpBplan(that, oGlobalData.IM_PERNR, oEvent.BLOCK.PLTYP, true);
        
        that.preenchimentoAutomatico(that, oEvent.BLOCK);
        that.fSetGlobalInformation(oEvent, that);
        that.fVerifyAction();
        that.fGetLog();
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
          that.getView().byId("btnExclude").setVisible(false);
          
          if(oEvent.BLOCK.ACTIO == "DEL"){
            that.getView().byId("btnExclude").setVisible(true);
            that.getView().byId("btnExclude").setEnabled(false);
          }
        }
        
      }
      
      function fError(oEvent) {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) == "99") {
          var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
          var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
          var zMessage = formattedDetail.replace("error", "");
          
          that.fVerifyAllowedUser(message, that);
          MessageBox.error(zMessage);
          
        } else {
          MessageBox.error(message);
        }
      }
      
      //MAIN READ
      oModel.read("ET_PRIVATE_PENSION" + urlParam, null, null, false, fSuccess, fError);
    },
    
    //	--------------------------------------------
    //	fUnableFields
    //	--------------------------------------------		
    fUnableFields: function () {
      var oView = this.getView();
      oView.byId("UploadCollection").setUploadButtonInvisible(true);
      oView.byId("cbPlan").setEnabled(false);
      oView.byId("cbBplan").setEnabled(false);
      oView.byId("cbVolCont").setEnabled(false);
      oView.byId("dtPeriodFrom").setEnabled(false);
      oView.byId("dtPeriodTo").setEnabled(false);
      oView.byId("ipValue").setEnabled(false);
      oView.byId("taJust").setEnabled(false);
    },
    //	--------------------------------------------
    //	fOpenFields
    //	--------------------------------------------		
    fOpenFields: function () {
      var oView = this.getView();
      oView.byId("UploadCollection").setUploadButtonInvisible(false);
      oView.byId("cbPlan").setEnabled(true);
      oView.byId("cbBplan").setEnabled(true);
      oView.byId("taJust").setEnabled(true);
      oView.byId("cbVolCont").setEnabled(true);
      
      if (oView.byId("cbVolCont").getSelected() === true) {
        oView.byId("dtPeriodFrom").setEnabled(true);
        oView.byId("dtPeriodTo").setEnabled(true);
        oView.byId("ipValue").setEnabled(true);
      }
      
    },
    
    //	--------------------------------------------
    //	fUnableAllButtons
    //	--------------------------------------------			
    fUnableAllButtons: function () {
      var oView = this.getView();
      
      // oView.byId("btnSave").setEnabled(false);
      oView.byId("btnExclude").setVisible(false);
      oView.byId("btnForms").setVisible(false);
      oView.byId("btnApprove").setVisible(false);
      oView.byId("btnAccept").setVisible(false);
      oView.byId("btnCancel").setVisible(false);
    },
    
    //	--------------------------------------------
    //	fVerifyChange
    //	--------------------------------------------		
    fVerifyChange: function (that, valorAtual) {
      var valor = true;
      
      if (!that) {
        that = this;
      }
      
      if (valorAtual != undefined) {
        valor = valorAtual;
      }
      
      var model = that.getView().getModel("ET_BLOCK").getData();
      var periodFrom = that.getView().byId("dtPeriodFrom").getValue();
      var periodTo = that.getView().byId("dtPeriodTo").getValue();
      var contrVolun = that.getView().byId("cbVolCont").getSelected();
      var vReturn;
      
      if (model.PLTYP == "" || model.BPLAN == "" || valor == "") {
        vReturn = false;
      } else {
        if (contrVolun === true) {
          if (periodFrom == "" || periodTo == "" || parseFloat(model.BETRG) <= 0 || model.BETRG == "") {
            vReturn = false;
          } else {
            vReturn = true;
          }
        } else {
          vReturn = true;
        }
      }
      
      that.getView().byId("btnAccept").setEnabled(vReturn);
      return vReturn;
      
    },
    
    //	--------------------------------------------
    //	fValidInputFields
    //	--------------------------------------------		
    fValidInputFields: function () {
      // this.fObligatoryFields();
      
      // var ipLifeInsurancePlan = this.getView().byId("ipLifeInsurancePlan").getValue();
      // var ipInsuranceOpt = this.getView().byId("ipInsuranceOpt").getValue();
      
      // if (ipLifeInsurancePlan === "" && ipInsuranceOpt === "") {
      // 	return true;
      // } else if(ipLifeInsurancePlan === "" || ipInsuranceOpt === "") {
      // 	return true;
      // }
      
      // return false; 
    },
    
    // --------------------------------------------
    // fFillCreatePayrollLoanData
    // -------------------------------------------- 		
    fFillCreatePayrollLoanData: function (oCreate, that) {
      var oActualModel = that.getView().getModel("ET_BLOCK").getData();
      var oOrigModel = that.getView().getModel("ET_BLOCK").getData();
      var from = that.getView().byId("dtPeriodFrom").getValue();
      var to = that.getView().byId("dtPeriodTo").getValue();
      
      if (that.exclude === false && (oActualModel.ACTIO == "" || oActualModel.ACTIO == undefined || oActualModel.ACTIO === "INS")) {
        oCreate.BLOCK.ACTIO = "INS";
      } else {
        oCreate.BLOCK.ACTIO = "DEL";
        oCreate.BLOCK.PLTYP = oOrigModel.PLTYP;
        oCreate.BLOCK.BPLAN = oOrigModel.BPLAN;
        oCreate.BLOCK.PERIOD_FROM = oOrigModel.PERIOD_FROM;
        oCreate.BLOCK.PERIOD_TO = oOrigModel.PERIOD_TO;
        oCreate.BLOCK.BETRG = oOrigModel.BETRG;
        return;
      }
      
      oCreate.BLOCK.PLTYP = oActualModel.PLTYP;
      oCreate.BLOCK.BPLAN = oActualModel.BPLAN;
      oCreate.BLOCK.PERIOD_FROM = "";
      oCreate.BLOCK.PERIOD_TO = "";
      oCreate.BLOCK.BETRG = "";
      
      if (that.getView().byId("cbVolCont").getSelected() === true) {
        oCreate.BLOCK.PERIOD_FROM = from.substring(6, 10) + from.substring(3, 5) + from.substring(0, 2);
        oCreate.BLOCK.PERIOD_TO = to.substring(6, 10) + to.substring(3, 5) + to.substring(0, 2);
        oCreate.BLOCK.BETRG = oActualModel.BETRG;
      }
    },
    
    // --------------------------------------------
    // fCreateRequisition
    // -------------------------------------------- 
    fCreateRequisition: function (that, action) {
      var oCreate = {};
      var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
      
      oCreate.BLOCK = {};
      
      oCreate.BLOCK.REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
      oCreate.IM_REQUISITION_ID = oGlobalData.IM_REQUISITION_ID;
      oCreate.IM_ACTION = action;
      oCreate.IM_LOGGED_IN = oGlobalData.IM_LOGGED_IN;
      oCreate.IM_PERNR = oGlobalData.IM_PERNR;
      oCreate.IM_BUKRS = oGlobalData.IM_BUKRS;
      oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
      
      if (oCreate.IM_LOGGED_IN == 5) {
        oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
      }
      
      that.fFillCreatePayrollLoanData(oCreate, that);
      
      //SUCESSO
      function fSuccess(oEvent) {
        oGlobalData.IM_REQUISITION_ID = oEvent.EX_REQUISITION_ID;
        
        switch (action) {
          case "A":
          MessageBox.success("Aprovação realizada com sucesso!");
          that.fVerifyAction(false, "A");
          break;
          
          case "S":
          that.fSucessMessageFromSendAction(oEvent);
          that.fVerifyAction(false, "S");
          that.saveAttachment();
          that.setDocumentStatus(oGlobalData.IM_REQUISITION_ID,action,"BDV");
          break;
          
          case "C":
          MessageBox.success("Operação realizada com sucesso! As alterações realizadas foram canceladas");
          
          that.fGetBlock();
          
          var oUploadCollection = that.getView().byId("UploadCollection");
          oUploadCollection.destroyItems();
          that.fVerifyAction(false, "C");
          break;
          
          case "R":
          MessageBox.success(
            "Operação realizada com sucesso! Após preencher todos os dados da solicitação, clique em enviar para dar continuidade ao atendimento"
            );
            
            that.fSetGlobalInformation(oEvent, that);
            that.fVerifyAction(false, "R");
            
            break;
          }
          that.fGetLog();
        }
        
        //ERRO
        function fError(oEvent) {
          oGlobalData.IM_REQUISITION_ID = that.fGetRequisitionId(oEvent);
          
          if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length == 0) {
            var message = $(oEvent.response.body).find("message").first().text();
            
            if (message === undefined || message === "" || message === " ") {
              message = "Erro inesperado. Favor contactar o administrador do sistema";
            }
            
            MessageBox.error(message);
            
          } else {
            var detail = $(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body);
            var formattedDetail = (detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", ""));
            formattedDetail = formattedDetail.replace("error", "");
            MessageBox.error(formattedDetail);
            
          }
        }
        
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/sap/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
        oModel.create("ET_PRIVATE_PENSION", oCreate, null, fSuccess, fError);
      },
      
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onSend: function () {
        
        if(this.exclude === false) {
          var valid = this.validAttachment();
          
          if (valid === false) {
            return;
          }
        }
        
        // if (this.fValidInputFields() === false) {
        this.fActions(this, "envio", "S");
        // } else {
        // 	this.handleErrorMessageBoxPress();
        // }
        
      },
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onApprove: function () {
        this.fActions(this, "aprovar", "A");
      },
      
      // --------------------------------------------
      // onSave
      // --------------------------------------------  
      onSave: function () {
        this.fActions(this, "gravação", "R");
      },
      
      // --------------------------------------------
      // onCancel
      // -------------------------------------------- 		
      onCancel: function () {
        
        if (this.exclude === false) {
          if (this.getView().byId("taJustSSG").getValue() === "") {
            this.handleErrorMessageBoxDisapprove();
            return;
          }
          this.fActions(this, "cancelamento", "C");
        } else {
          this.fOpenFields();
          this.exclue = false;
          this.getView().byId("btnCancel").setVisible(false);
        }
        
      },
      
      // --------------------------------------------
      // onPressQuickView
      // -------------------------------------------- 
      onPressQuickView: function () {
        this._Dialog = sap.ui.xmlfragment("cadastralMaintenance.helpTextFiles.QuickViewHelpInsurance", this);
        this._Dialog.open();
      },
      // --------------------------------------------
      // onClose
      // -------------------------------------------- 
      onClose: function () {
        this._Dialog.close();
      },
      
      onBeforeUpload: function (oEvent) {
        
        var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
        var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
        var filename = oEvent.getParameter("fileName");
        var type = this.getView().getModel("ET_BLOCK").getData().TYPE;
        var caracteristica = "FORMULARIOPREPRI";
        const uploadCollection = this.getView().byId("UploadCollection");
        const conta_anexos =  uploadCollection.getItems().length;
        
        if (req == '00000000') {
          return;
        }
        var dados = "";
        if(this.settingStatus){
          dados = "BENEFICIOS;BDV;" + req + ";STATUS;" + conta_anexos + ";S;" + pernr;
        }else{      
          // FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
          dados = filename + ";BDV;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;
        }
        oEvent.getParameters().addHeaderParameter(new sap.m.UploadCollectionParameter({
          name: "slug",
          value: dados
        }));
        
      },
      onUploadAttComplete: function (oEvent) {
        if (oEvent.mParameters.mParameters.status !== 201) {
          MessageBox.error("Falha ao Salvar Arquivo ..!!");
        } else {
          var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
          this.getAttachment(req, "BDV");
        }
      },
      
      onChange: function (oEvent) {
        this.fVerifyChange(this, oEvent.getSource().getValue());
      },
      onFormulario: function () {
        
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_EMPR_CONSIG_SRV/");
        
        function fSuccess(oEvent) {
          window.open(oEvent.results[0].LinkPdf);
        }
        
        function fError(oEvent) {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) == "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            that.fVerifyAllowedUser(message, that);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
        
        var model = this.getView().getModel("ET_BLOCK").getData();
        var begda = this.getView().byId("dtBegda").getValue();
        var endda = this.getView().byId("dtEndda").getValue();
        
        var IvBanco = model.BANCO;
        var IvAgencia = model.AGENCIA;
        var IvValEmp = model.BETRG;
        var IvNumPre = model.NUM_PREST;
        var IvVencP = begda.substring(6, 10) + begda.substring(3, 5);
        var IvVencU = endda.substring(6, 10) + endda.substring(3, 5);
        
        var url = "?$filter=IvBanco eq '" + IvBanco + "' and IvAgencia eq '" + IvAgencia + "' and IvValEmp eq '" + IvValEmp +
        "' and IvNumPre eq '" + IvNumPre + "' and IvVencP eq '" + IvVencP + "' and IvVencU eq '" + IvVencU + "'";
        //MAIN READ
        oModel.read("EmprConsigSet" + url, null, null, false, fSuccess, fError);
        
      },
      onChangeValue: function (oEvent) {
        this.fVerifyChange(this, oEvent.getSource().getValue());
        
      },
      preenchimentoAutomatico: function (that, block) {
        
        if(block.PLTYP != ""){
          that.getView().byId("btnExclude").setVisible(true);
        }
        
        if (block.PERIOD_FROM == "" || block.PERIOD_FROM === "00000000") {
          return;
        }
        that.getView().byId("cbVolCont").setSelected(true);
        var data = block.PERIOD_FROM;
        var ano = data.substring(0, 4);
        var mes = data.substring(4, 6);
        that.getView().byId("dtPeriodFrom").setDateValue(new Date(ano, mes - 1))
        // var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
        // that.getView().byId("dtPeriodFrom").setValue(dataF);
        
        data = block.PERIOD_TO;
        ano = data.substring(0, 4);
        mes = data.substring(4, 6);
        that.getView().byId("dtPeriodTo").setDateValue(new Date(ano, mes - 1))
        // dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
        // that.getView().byId("dtPeriodTo").setValue(dataF);
        
      },
      onChangeBank: function (oEvent) {
        var model = this.getView().getModel("ET_BLOCK");
        model.getData().BANCO = oEvent.getSource().getValue();
        model.setData(model);
        this.getView().setModel(model, "ET_BLOCK");
        
        this.fVerifyChange(this);
      },
      fSearchHelpPltyp: function (that, pernr) {
        var oEntry = [];
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
        var oGlobalModel = that.getView().getModel("ET_GLOBAL_DATA");
        var urlParam = null;
        
        that.pltyp = new JSONModel();
        that.pltyp.setData({
          table: []
        });
        
        function fSuccess(oEvent) {
          for (var i = 0; i < oEvent.results.length; i++) {
            oEntry = {
              key: oEvent.results[i].PLTYP,
              desc: oEvent.results[i].LTEXT
            };
            that.pltyp.getData().table.push(oEntry);
            
            oEntry = [];
          }
          //Seta Lista no Model da View	
          that.getView().setModel(that.pltyp, "PLTYP_LIST");
          
        }
        
        function fError(oEvent) {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) == "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            that.fVerifyAllowedUser(message, that);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
        
        var oFilters = [];
        oFilters.push(new sap.ui.model.Filter("IM_PERNR", sap.ui.model.FilterOperator.EQ, pernr));
        oFilters.push(new sap.ui.model.Filter("IM_BUKRS", sap.ui.model.FilterOperator.EQ, oGlobalModel.IM_BUKRS));
        oModel.read("/ET_SH_PRI_PEN_BEN_PLTYP", {
          filters: oFilters,
          async: false,
          success: fSuccess,
          error: fError
        });
      },
      fSearchHelpBplan: function (that, pernr, pltyp, first) {
        var oEntry = [];
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
        var block = that.getView().getModel("ET_BLOCK").getData();
        var oGlobalModel = that.getView().getModel("ET_GLOBAL_DATA");
        var encontrou = false;
        var urlParam = null;
        
        that.bplan = new JSONModel();
        that.bplan.setData({
          table: []
        });
        
        if (pltyp == "") {
          that.getView().setModel(that.bplan, "BPLAN_LIST");
          that.getView().byId("cbBplan").setEnabled(false);
          that.getView().byId("cbBplan").setSelectedKey();
          return;
        }
        
        function fSuccess(oEvent) {
          
          for (var i = 0; i < oEvent.results.length; i++) {
            oEntry = {
              key: oEvent.results[i].BPLAN,
              desc: oEvent.results[i].LTEXT
            };
            that.bplan.getData().table.push(oEntry);
            
            oEntry = [];
            if(block.BPLAN != "" && block.BPLAN != undefined && block.BPLAN == oEvent.results[i].BPLAN){
              encontrou = true;
            }
          }
          
          //Seta Lista no Model da View	
          that.getView().setModel(that.bplan, "BPLAN_LIST");
          
          if (oEvent.results.length == 0) {
            that.getView().byId("cbBplan").setEnabled(false);
            that.getView().byId("cbBplan").setSelectedKey();
          } else {
            that.getView().byId("cbBplan").setEnabled(true);
          }
          
          if(encontrou === false){
            that.getView().byId("cbBplan").setValue(block.BPLAN);
          }
          
          
        }
        
        function fError(oEvent) {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) == "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            that.fVerifyAllowedUser(message, that);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
        
        if (first === undefined) {
          that.getView().byId("cbBplan").setSelectedKey();
        }
        
        var oFilters = [];
        oFilters.push(new sap.ui.model.Filter("IM_PERNR", sap.ui.model.FilterOperator.EQ, pernr));
        oFilters.push(new sap.ui.model.Filter("PLTYP", sap.ui.model.FilterOperator.EQ, pltyp));
        oFilters.push(new sap.ui.model.Filter("IM_BUKRS", sap.ui.model.FilterOperator.EQ, oGlobalModel.IM_BUKRS));
        
        oModel.read("/ET_SH_PRI_PEN_BEN_BPLAN", {
          filters: oFilters,
          async: false,
          success: fSuccess,
          error: fError
        });
      },
      fContVolun: function (oEvent) {
        var state = oEvent.getSource().getSelected();
        
        this.getView().byId("dtPeriodFrom").setEnabled(state);
        this.getView().byId("dtPeriodTo").setEnabled(state);
        this.getView().byId("ipValue").setEnabled(state);
        this.getView().byId("lblValue").setRequired(state);
        this.getView().byId("lblPeriodTo").setRequired(state);
        this.getView().byId("lblPeriodFrom").setRequired(state);
        this.fVerifyChange(this, true);
      },
      onChangePlan: function (oEvent) {
        var key = oEvent.getSource().getSelectedKey();
        var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
        this.fSearchHelpBplan(this, pernr, key);
        this.fVerifyChange(this, oEvent.getSource().getValue());
      },
      changeDtFrom: function (oEvent) {
        var dtFrom = this.getView().byId("dtPeriodFrom").getValue();
        var ano = dtFrom.substring(6, 10);
        var mes = dtFrom.substring(3, 5);
        var dia = dtFrom.substring(0, 2);
        this.getView().byId("dtPeriodTo").setMinDate(new Date(ano, mes - 1, dia));
        this.fVerifyChange(this, oEvent.getSource().getValue());
      },
      onDelete: function () {
        this.fUnableFields();
        this.getView().byId("btnCancel").setVisible(true);
        this.getView().byId("btnAccept").setEnabled(true);
        this.exclude = true;
      }
      
    });
    
  });