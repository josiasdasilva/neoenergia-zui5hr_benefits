sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "cadastralMaintenance/formatter/Formatter",
  "sap/ui/model/json/JSONModel",
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel) {
  "use strict";
  
  return BaseController.extend("cadastralMaintenance.view.DetailEmergencyLoan", {
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
        
        if (oGlobalData.IM_LOGGED_IN === 0) {
          that.getView().byId("btnForms").setVisible(true);
          that.getView().setModel(new sap.ui.model.json.JSONModel({
            VALUE: oEvent.BLOCK.VALUE
          }), "ET_BLOCK");
          
          var anoAtual = new Date().getFullYear();
          debugger;
          
          if (anoAtual == oEvent.BLOCK.LAST_SOLIC.substring(0, 4)) {
            MessageBox.error("Empréstimo já feito neste ano!");
            var data = oEvent.BLOCK.LAST_SOLIC;
            var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
            that.getView().byId("dtPeriod").setValue(dataF);
            
            that.fUnableAllButtons();
            that.fUnableFields();
            return;
          }
          
          var today = new Date();
          var hire_date = new Date(that.getView().getModel("ET_HEADER").oData.HIRE_DATE);
          var diffDays = Math.ceil((today - hire_date) / (1000 * 60 * 60 * 24));
          if (diffDays < 365) {
            MessageBox.error("Colaborador com menos de 1 ano não tem direito ao benefício");
            that.fUnableAllButtons();
            that.fUnableFields();
            return;
          }
          
        }
        
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
          var data = oEvent.BLOCK.DATA;
          // var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
          var dataF = data.substring(6, 8) + "/" + data.substring(4, 6) + "/" + data.substring(0, 4);
          that.getView().byId("dtPeriod").setValue(dataF);
          
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
        that.fSetGlobalInformation(oEvent, that);
        that.fVerifyAction();
        that.fGetLog();
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
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
      oModel.read("ET_EMERGENCY_LOAN" + urlParam, null, null, false, fSuccess, fError);
    },
    
    //	--------------------------------------------
    //	fUnableFields
    //	--------------------------------------------		
    fUnableFields: function () {
      var oView = this.getView();
      oView.byId("UploadCollection").setUploadButtonInvisible(true);
      oView.byId("ipRequestedValue").setEnabled(false);
      oView.byId("dtPeriod").setEnabled(false);
      oView.byId("taJust").setEnabled(false);
    },
    
    //	--------------------------------------------
    //	fUnableAllButtons
    //	--------------------------------------------			
    fUnableAllButtons: function () {
      var oView = this.getView();
      
      // oView.byId("btnSave").setEnabled(false);
      oView.byId("btnForms").setVisible(false);
      oView.byId("btnApprove").setVisible(false);
      oView.byId("btnAccept").setVisible(false);
      oView.byId("btnCancel").setVisible(false);
    },
    
    //	--------------------------------------------
    //	fVerifyChange
    //	--------------------------------------------		
    fVerifyChange: function (that) {
      var value = this.getView().byId("ipRequestedValue").getValue();
      var date = this.getView().byId("dtPeriod").getValue();
      
      if (parseFloat(value) > 0 && date !== "") {
        that.getView().byId("btnAccept").setEnabled(true);
      } else {
        that.getView().byId("btnAccept").setEnabled(false);
      }
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
    // fFillCreateEmergencyLoanData
    // -------------------------------------------- 		
    fFillCreateEmergencyLoanData: function (oCreate, that) {
      var oActualModel = that.getView().getModel("ET_BLOCK").getData();
      var data = that.getView().byId("dtPeriod").getValue();
      
      oCreate.BLOCK.ACTIO = "INS";
      oCreate.BLOCK.VALUE = oActualModel.VALUE;
      oCreate.BLOCK.DATA = data.substring(6, 10) + data.substring(3, 5) + data.substring(0, 2);
      
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
      
      that.fFillCreateEmergencyLoanData(oCreate, that);
      
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
        oModel.create("ET_EMERGENCY_LOAN", oCreate, null, fSuccess, fError);
      },
      
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onSend: function () {
        
        var valid = this.validAttachment();
        
        if (valid === false) {
          return;
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
        
        if (this.getView().byId("taJustSSG").getValue() === "") {
          this.handleErrorMessageBoxDisapprove();
          return;
        }
        
        this.fActions(this, "cancelamento", "C");
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
        var caracteristica = "FORMULARIOEMPREST";
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
        this.fVerifyChange(this);
      },
      onFormulario: function () {
        
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_EMPR_EMERG_SRV/");
        
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
        
        if (this.fObligatoryFields() === false) {
          return;
        }
        
        var value = this.getView().byId("ipRequestedValue").getValue();
        // value = value.replaceAll(".","");
        value = value.replace(/\./g, '');
        value = value.replace(",", ".");
        
        var data = this.getView().byId("dtPeriod").getValue();
        var period = data.substring(6, 10) + data.substring(3, 5);
        
        var url = "?$filter=IvValEmp eq '" + value + "' and IvPeriodo eq '" + period + "'";
        //MAIN READ
        oModel.read("EmprEmergSet" + url, null, null, false, fSuccess, fError);
        
      },
      fObligatoryFields: function () {
        
        if (parseFloat(this.getView().byId("ipRequestedValue").getValue()) <= 0 || this.getView().byId("dtPeriod").getValue() == "") {
          this.handleErrorMessageBoxPress();
          return false;
        }
        
      }
      
    });
    
  });