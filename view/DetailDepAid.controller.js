sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel",
  "sap/m/MessageBox",
  "cadastralMaintenance/view/BaseController",
  "cadastralMaintenance/formatter/Formatter",
  "sap/ui/model/json/JSONModel",
  "sap/m/Dialog"
], function (Controller, ResourceModel, MessageBox, BaseController, Formatter, JSONModel, Dialog) {
  "use strict";
  return BaseController.extend("cadastralMaintenance.view.DetailDepAid", {
    formatter: Formatter,
    onInit: function () {
      this.oInitialLoadFinishedDeferred = jQuery.Deferred();
      
      if (sap.ui.Device.system.phone) {
        //Do not wait for the master2 when in mobile phone resolution
        this.oInitialLoadFinishedDeferred.resolve();
      } else {
        // var oEventBus = this.getEventBus();
        // oEventBus.subscribe("Master2", "LoadFinished", this.onMasterLoaded, this);
      }
      
      this.initAttachment();
      
      this.getRouter().attachRouteMatched(this.onRouteMatched, this);
      
      this.fSetHeader();
      this.fSetGlobalInformation();
      
      this.fTipoSolicitacao();
      
      this.fGetBlock();
      this.fSearchHelps(this, this.getView().getModel("ET_HEADER").getData().PERNR);
      this.fDisableAll();
    },
    fDisableAll: function () {
      this.getView().byId("btnAddSol").setEnabled(false);
      this.getView().byId("btnReembolso").setEnabled(false);
      this.getView().byId("btnExcluir").setEnabled(false);
    },
    fEnableAll: function () {
      this.getView().byId("btnAddSol").setEnabled(true);
      this.getView().byId("btnReembolso").setEnabled(true);
      this.getView().byId("btnExcluir").setEnabled(true);
    },
    fGetUrlWithObjps: function(pernr,requisitionId,loggedIn,objps) {
      var url = '';
      url = this.fFillURLParam("IM_PERNR", pernr);
      url = this.fFillURLParam("IM_REQUISITION_ID", requisitionId, url);
      //url = this.fFillURLParam("OBJPS", objps, url);
      url = this.fFillURLParam("IM_LOGGED_IN", loggedIn, url, true);
      return url;
    },
    fGetBlockDependent: function (objps) {
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
      
      var oGlobalData = this.getView().getModel("ET_GLOBAL_DATA");
      // this.getDependents();
      
      var oModelDep = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      this.fSetSearchHelpValue(oModelDep, "ET_SH_DEPENDENTS");
      
      var urlParam = this.fGetUrlWithObjps(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN, objps);
      
      const fSuccess = (oEvent) => {
        var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
        if (parseFloat(oEvent.BLOCK.VALUE_APPR) <= 0) {
          oEvent.BLOCK.VALUE_APPR = oEvent.BLOCK.VALUE;
        }
        
        //Isolates the model
        var oDataOrig = JSON.parse(JSON.stringify(oValue.oData));
        this.getView().setModel(oDataOrig, "ET_BLOCK_ORIG");
        
        this.getView().byId("taJust").setValue(oEvent.OBSERVATION);
        
        if (oEvent.OBSERVATION_SSG !== null && oEvent.OBSERVATION_SSG !== "" && oEvent.OBSERVATION_SSG !== undefined) {
          this.getView().byId("taJustSSG").setValue(oEvent.OBSERVATION_SSG);
          this.getView().byId("formJustificationSSG").setVisible(true);
        }
        
        // se tem id verificar os anexos
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          var dataFrom = oEvent.BLOCK.PERIOD_FROM;
          var dtFrom = new Date(dataFrom.substring(0, 4), dataFrom.substring(4, 6) - 1, dataFrom.substring(6, 8));
          this.getView().byId("dtPeriodFrom").setDateValue(dtFrom);
          
          this.getView().byId("lblDependentFullName").setVisible(false);
          this.getView().byId("slFullName").setVisible(false);
          this.getView().byId("lblIpDependentFullName").setVisible(true);
          this.getView().byId("ipFullName").setVisible(true);
          this.getView().byId("ipRequestedValue").setValue(oEvent.BLOCK.BETRG);
          
          if (oEvent.BLOCK.PERIOD_TO === ""){
            this.getView().byId("slSolType").setSelectedKey("M");
            this.getView().byId("lblPeriodTo").setVisible(false);
            this.getView().byId("dtPeriodTo").setVisible(false);
          } else {
            var dataTo = oEvent.BLOCK.PERIOD_TO;
            var dtTo = new Date(dataTo.substring(0,4), dataTo.substring(4,6) - 1, dataTo.substring(6,8));
            this.getView().byId("dtPeriodTo").setDateValue(dtTo);
            this.getView().byId("slSolType").setSelectedKey("S");
            this.getView().byId("lblPeriodTo").setVisible(true);
            this.getView().byId("dtPeriodTo").setVisible(true);
          }
          
          if (oEvent.BLOCK.REEMBOLSO === "X") {
            oEvent.BLOCK.TYPE_SOL = "Reembolso";
          } else if (oEvent.BLOCK.REEMBOLSO === "" && oEvent.BLOCK.ACTIO === "INS") {
            oEvent.BLOCK.TYPE_SOL = "Primeira Solicitação";
          } else {
            oEvent.BLOCK.TYPE_SOL = "Exclusão";
          }
          
          // var filters = [];
          
          // var filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
          
          this.getView().setModel(oModel, "anexo");
          
          // Update list binding
          // that.getView().byId("upldAttachments").getBinding("items").filter(filters);
        }
        
        this.getView().setModel(oValue, "ET_BLOCK");
        
        if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
          if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
          oEvent.BLOCK.REQUISITION_ID !== "00000000") {
            
            //retornou req do model, mas não tem na url
            if (oGlobalData.IM_REQ_URL === "") {
              MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
            }
          }
        }
        
        this.fSetGlobalInformation(oEvent, this);
        this.fVerifyAction();
        this.fGetLog();
        this.fChangeForms(this);
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          this.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
          if (oEvent.BLOCK.ACTIO === "DEL") {
            this.fOcultaCamposDel();
          }
        }
        
      }
      
      const fError = (oEvent) => {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) === "99") {
          var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
          var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
          var zMessage = formattedDetail.replace("error", "");
          
          this.fVerifyAllowedUser(message, this);
          MessageBox.error(zMessage);
          
        } else {
          MessageBox.error(message);
        }
      }
      
      //MAIN READ
      oModel.read("ET_DEP_AID" + urlParam, null, null, false, fSuccess, fError);
    },
    //	--------------------------------------------
    //	fGetBlock
    //	--------------------------------------------		
    fGetBlock: function () {
      var that = this;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
      
      var oGlobalData = that.getView().getModel("ET_GLOBAL_DATA");
      // this.getDependents();
      
      var oModelDep = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      this.fSetSearchHelpValue(oModelDep, "ET_SH_DEPENDENTS");
      
      if (oGlobalData.IM_LOGGED_IN === 0) {
        this.getView().setModel(new sap.ui.model.json.JSONModel(), "ET_BLOCK");
        this.getDependents(this);
        return;
      }
      
      var urlParam = this.fGetUrl(oGlobalData.IM_PERNR, oGlobalData.IM_REQ_URL, oGlobalData.IM_LOGGED_IN);
      
      function fSuccess(oEvent) {
        var oValue = new sap.ui.model.json.JSONModel(oEvent.BLOCK);
        if (parseFloat(oEvent.BLOCK.VALUE_APPR) <= 0) {
          oEvent.BLOCK.VALUE_APPR = oEvent.BLOCK.VALUE;
        }
        
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
          var dataFrom = oEvent.BLOCK.PERIOD_FROM;
          var dtFrom = new Date(dataFrom.substring(0, 4), dataFrom.substring(4, 6) - 1, dataFrom.substring(6, 8));
          that.getView().byId("dtPeriodFrom").setDateValue(dtFrom);
          
          that.getView().byId("lblDependentFullName").setVisible(false);
          that.getView().byId("slFullName").setVisible(false);
          that.getView().byId("lblIpDependentFullName").setVisible(true);
          that.getView().byId("ipFullName").setVisible(true);
          that.getView().byId("ipRequestedValue").setValue(oEvent.BLOCK.BETRG);
          
          if (oEvent.BLOCK.PERIOD_TO === ""){
            that.getView().byId("slSolType").setSelectedKey("M");
            that.getView().byId("lblPeriodTo").setVisible(false);
            that.getView().byId("dtPeriodTo").setVisible(false);
          } else {
            var dataTo = oEvent.BLOCK.PERIOD_TO;
            var dtTo = new Date(dataTo.substring(0,4), dataTo.substring(4,6) - 1, dataTo.substring(6,8));
            that.getView().byId("dtPeriodTo").setDateValue(dtTo);
            that.getView().byId("slSolType").setSelectedKey("S");
            that.getView().byId("lblPeriodTo").setVisible(true);
            that.getView().byId("dtPeriodTo").setVisible(true);
          }
          
          if (oEvent.BLOCK.REEMBOLSO === "X") {
            oEvent.BLOCK.TYPE_SOL = "Reembolso";
          } else if (oEvent.BLOCK.REEMBOLSO === "" && oEvent.BLOCK.ACTIO === "INS") {
            oEvent.BLOCK.TYPE_SOL = "Primeira Solicitação";
          } else {
            oEvent.BLOCK.TYPE_SOL = "Exclusão";
          }
          
          // var filters = [];
          
          // var filters = [new sap.ui.model.Filter("IDREQ", sap.ui.model.FilterOperator.EQ, oEvent.BLOCK.REQUISITION_ID)];
          
          that.getView().setModel(oModel, "anexo");
          
          // Update list binding
          // that.getView().byId("upldAttachments").getBinding("items").filter(filters);
        }
        
        that.getView().setModel(oValue, "ET_BLOCK");
        
        if (oEvent.EX_MESSAGE.TYPE === "W" & oEvent.IM_ACTION !== "A") {
          if ((oEvent.BLOCK.REQUISITION_ID !== null || oEvent.BLOCK.REQUISITION_ID !== "" || oEvent.BLOCK.REQUISITION_ID !== undefined) &
          oEvent.BLOCK.REQUISITION_ID !== "00000000") {
            
            //retornou req do model, mas não tem na url
            if (oGlobalData.IM_REQ_URL === "") {
              MessageBox.warning(oEvent.EX_MESSAGE.MESSAGE);
            }
          }
        }
        
        that.fSetGlobalInformation(oEvent, that);
        that.fVerifyAction();
        that.fGetLog();
        that.fChangeForms(that);
        if (oEvent.BLOCK.REQUISITION_ID !== "00000000") {
          that.getAttachment(oEvent.BLOCK.REQUISITION_ID, "BDV");
          if (oEvent.BLOCK.ACTIO === "DEL") {
            that.fOcultaCamposDel();
          }
        }
        
      }
      
      function fError(oEvent) {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) === "99") {
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
      oModel.read("ET_DEP_AID" + urlParam, null, null, false, fSuccess, fError);
    },
    
    //	--------------------------------------------
    //	fUnableFields
    //	--------------------------------------------		
    fUnableFields: function () {
      var oView = this.getView();
      
      oView.byId("UploadCollection").setUploadButtonInvisible(true);
      oView.byId("ipType").setEnabled(false);
      oView.byId("slMemberType").setEnabled(false);
      oView.byId("slFullName").setEnabled(false);
      oView.byId("cbTypeAux").setEnabled(false);
      oView.byId("slSolType").setEnabled(true);
      oView.byId("dtPeriodFrom").setEnabled(false);
      oView.byId("dtPeriodTo").setEnabled(false);
      oView.byId("ipRequestedValue").setEnabled(false);
      oView.byId("ipInst").setEnabled(false);
      oView.byId("ipCNPJ").setEnabled(false);
      oView.byId("taJust").setEnabled(false);
    },
    fOcultaCamposDel: function () {
      var oView = this.getView();
      oView.byId("lblMemberType").setVisible(false);
      oView.byId("slMemberType").setVisible(false);
      oView.byId("lblDependentFullName").setVisible(false);
      oView.byId("slFullName").setVisible(false);
      oView.byId("lblIpDependentFullName").setVisible(false);
      oView.byId("ipFullName").setVisible(false);
      oView.byId("lblSolType").setVisible(false);
      oView.byId("slSolType").setVisible(false);
      oView.byId("lblPeriodFrom").setVisible(false);
      oView.byId("dtPeriodFrom").setVisible(false);
      oView.byId("lblPeriodTo").setVisible(false);
      oView.byId("dtPeriodTo").setVisible(false);
      oView.byId("lblRequestedValue").setVisible(false);
      oView.byId("ipRequestedValue").setVisible(false);
      oView.byId("ipInst").setVisible(false);
      oView.byId("lblCNPJ").setVisible(false);
      oView.byId("ipCNPJ").setVisible(false);
      oView.byId("lblInst").setVisible(false);
      
    },
    fChangeForms: function (that) {
      that.getView().byId("formDepAid").setVisible(true);
      that.getView().byId("formDependents").setVisible(false);
    },
    
    //	--------------------------------------------
    //	fUnableAllButtons
    //	--------------------------------------------			
    fUnableAllButtons: function () {
      var oView = this.getView();
      
      oView.byId("btnForms").setVisible(false);
      oView.byId("btnApprove").setVisible(false);
      oView.byId("btnAccept").setVisible(false);
      oView.byId("btnCancel").setVisible(false);
    },
    fTipoSolicitacao: function () {
      
      var oData = {
        "SelectedPeriod": "M",
        "TipoSolic": [{
          "key": "M",
          "text": "Mensal"
        }, {
          "key": "S",
          "text": "Semestral"
        }],
        "Editable": true,
        "Enabled": true
      };
      
      var TipoSolic = new JSONModel(oData);
      this.getView().setModel(TipoSolic, "TipoSolic");
    },
    fShTipoAuxDep: function (oButtonName) {
      var pernr = this.getView().getModel("ET_HEADER").getData().PERNR;
      var oEntry = [];
      var urlParam = null;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      this.Benef = new JSONModel();
      this.Benef.setData({
        table: []
      });
      if (pernr !== undefined && pernr !== null && pernr !== "") {
        urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
      }
      
      const fSuccess = (oEvent) => {
        var model = this.getView().getModel("ET_BLOCK");
        var encontrou = false;
        var results = this.fGetSelectedRowDetail();
        var idade = {
          anos: parseInt(results.IDADE),
          mes: parseInt(results.IDADE_MES),
          dia: parseInt(results.IDADE_DIA)
        };
        switch (oButtonName) {
          case "btnAddSol": {
            // Somente os beneficios ainda nao adquiridos
            let i0377 = results.I0377.split(";").filter(r => r !== "");
            let permitidos = results.PERMITIDOS.split(";").filter(r => r !== "");
            for (let x = 0; x < permitidos.length; x++) {
              for (let z = 0; z < i0377.length; z++) {
                if (permitidos[x] === i0377[z]){
                  permitidos.splice(x,1);
                }
              }
            }
            // somente os permitidos para a idade do dependente
            for (let y = 0; y < permitidos.length; y++) {
              for (let i = 0; i < oEvent.results.length; i++) {
                if (oEvent.results[i].BPLAN === permitidos[y] ) {
                  if (this.fValidaBenIdade(idade, oEvent.results[i].BPLAN)) {
                    oEntry = {
                      key: oEvent.results[i].BPLAN,
                      desc: oEvent.results[i].LTEXT
                    };
                    this.Benef.getData().table.push(oEntry);
                  }
                }
              }
            }
            break;
          }
          case "btnReembolso": { 
            // todos os cadastrados no 0377
            // !!! falta validar se ja foi recebido no periodo
            let i0377 = results.I0377.split(";").filter(r => r !== "");
            for (let x = 0; x < i0377.length; x++) {
              for (let i = 0; i < oEvent.results.length; i++) {
                if (oEvent.results[i].BPLAN === i0377[x] ) {
                  if (this.fValidaBenIdade(idade, oEvent.results[i].BPLAN)) {
                    oEntry = {
                      key: oEvent.results[i].BPLAN,
                      desc: oEvent.results[i].LTEXT
                    };
                    this.Benef.getData().table.push(oEntry);
                  }
                }
              }
            }
            break;
          }
          case "btnExcluir": {
            // todos os cadastrados no 0377
            let i0377 = results.I0377.split(";").filter(r => r !== "");
            for (let x = 0; x < i0377.length; x++) {
              for (let i = 0; i < oEvent.results.length; i++) {
                if (oEvent.results[i].BPLAN === i0377[x] ) {
                  oEntry = {
                    key: oEvent.results[i].BPLAN,
                    desc: oEvent.results[i].LTEXT
                  };
                  this.Benef.getData().table.push(oEntry);
                }
              }
            }
            break;
          }
        }
        //Seta Lista no Model da View	
        this.getView().setModel(this.Benef, "benef");
      }
      
      const fError = (oEvent) => {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) === "99") {
          var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
          var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
          var zMessage = formattedDetail.replace("error", "");
          
          this.fVerifyAllowedUser(message, this);
          MessageBox.error(zMessage);
          
        } else {
          MessageBox.error(message);
        }
      }
      // busca texto e nome dos auxilios dependentes (TODOS)
      oModel.read("ET_SH_DEPEN_TYPE_PLAN", null, urlParam, false, fSuccess, fError);
      /* oModel.read("ET_SH_DEPEN_TYPE_PLAN", {
        urlParameters: urlParam,
        success: (oEvent) => {
          var model = this.getView().getModel("ET_BLOCK");
          var encontrou = false;
          var results = this.fGetSelectedRowDetail();
          var idade = {
            anos: parseInt(results.IDADE),
            mes: parseInt(results.IDADE_MES),
            dia: parseInt(results.IDADE_DIA)
          };
          switch (oButtonName) {
            case "btnAddSol": {
              // Somente os beneficios ainda nao adquiridos
              let i0377 = results.I0377.split(";").filter(r => r !== "");
              let permitidos = results.PERMITIDOS.split(";").filter(r => r !== "");
              for (let x = 0; x < permitidos.length; x++) {
                for (let z = 0; z < i0377.length; z++) {
                  if (permitidos[x] === i0377[z]){
                    permitidos.splice(x,1);
                  }
                }
              }
              // somente os permitidos para a idade do dependente
              for (let y = 0; y < permitidos.length; y++) {
                for (let i = 0; i < oEvent.results.length; i++) {
                  if (oEvent.results[i].BPLAN === permitidos[y] ) {
                    if (this.fValidaBenIdade(idade, oEvent.results[i].BPLAN)) {
                      oEntry = {
                        key: oEvent.results[i].BPLAN,
                        desc: oEvent.results[i].LTEXT
                      };
                      this.Benef.getData().table.push(oEntry);
                    }
                  }
                }
              }
              break;
            }
            case "btnReembolso": { 
              // todos os cadastrados no 0377
              // !!! falta validar se ja foi recebido no periodo
              let i0377 = results.I0377.split(";").filter(r => r !== "");
              for (let x = 0; x < i0377.length; x++) {
                for (let i = 0; i < oEvent.results.length; i++) {
                  if (oEvent.results[i].BPLAN === i0377[x] ) {
                    if (this.fValidaBenIdade(idade, oEvent.results[i].BPLAN)) {
                      oEntry = {
                        key: oEvent.results[i].BPLAN,
                        desc: oEvent.results[i].LTEXT
                      };
                      this.Benef.getData().table.push(oEntry);
                    }
                  }
                }
              }
              break;
            }
            case "btnExcluir": {
              // todos os cadastrados no 0377
              let i0377 = results.I0377.split(";").filter(r => r !== "");
              for (let x = 0; x < i0377.length; x++) {
                for (let i = 0; i < oEvent.results.length; i++) {
                  if (oEvent.results[i].BPLAN === i0377[x] ) {
                    oEntry = {
                      key: oEvent.results[i].BPLAN,
                      desc: oEvent.results[i].LTEXT
                    };
                    this.Benef.getData().table.push(oEntry);
                  }
                }
              }
              break;
            }
          }
          //Seta Lista no Model da View	
          this.getView().setModel(this.Benef, "benef");
        },
        error: (oEvent) => {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) === "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            this.fVerifyAllowedUser(message, this);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
      }); */
      //Seta Lista no Model da View	
      this.getView().setModel(this.Benef, "benef");
    },
    
    fValidaBenIdade: function (idade, beneficio){
      let resultado = false;
      switch (beneficio) {
        case 'CREC':
        if (idade.anos === 0 && idade.mes < 7) {
          resultado = true;
        }
        break;
        case 'MGUA':
        if (idade.anos <= 4) {
          resultado = true;
        }
        break;
        case 'ACRC':
        if ((idade.anos === 0 && idade.mes >= 7) || (idade.anos > 0)) {
          if (idade.anos < 4) {
            resultado = true;
          }
        }
        break;
        case 'PREE':
        if (idade.anos >= 2 && idade.anos < 10) {
          resultado = true;
        }
        break;
      }
      return resultado;
    },
    fShTipoAuxilio: function (that, pernr) {
      var oEntry = [];
      var urlParam = null;
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      
      that.Benef = new JSONModel();
      that.Benef.setData({
        table: []
      });
      if (pernr !== undefined && pernr !== null && pernr !== "") {
        urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
      }
      
      function fSuccess(oEvent) {
        for (var i = 0; i < oEvent.results.length; i++) {
          oEntry = {
            key: oEvent.results[i].BPLAN,
            desc: oEvent.results[i].LTEXT
          };
          that.Benef.getData().table.push(oEntry);
          
          oEntry = [];
        }
        //Seta Lista no Model da View	
        that.getView().setModel(that.Benef, "benef");
      }
      function fError(oEvent) {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) === "99") {
          var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
          var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
          var zMessage = formattedDetail.replace("error", "");
          
          that.fVerifyAllowedUser(message, that);
          MessageBox.error(zMessage);
          
        } else {
          MessageBox.error(message);
        }
      }
      oModel.read("ET_SH_DEPEN_TYPE_PLAN", null, urlParam, false, fSuccess, fError);
    },
    fShPeriodo: function (that, pernr) {
      
      var oEntry = [];
      var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_SEARCH_HELP_SRV_01/");
      var urlParam = null;
      
      that.BenefEx = new JSONModel();
      that.BenefEx.setData({
        table: []
      });
      
      if (pernr !== undefined && pernr !== null && pernr !== "") {
        urlParam = this.fFillURLFilterParam("IM_PERNR", pernr);
      }
      function fSuccessEx(oEvent) {
        for (var i = 0; i < oEvent.results.length; i++) {
          oEntry = {
            key: oEvent.results[i].BPLAN,
            desc: oEvent.results[i].LTEXT
          };
          that.BenefEx.getData().table.push(oEntry);
          
          oEntry = [];
        }
        //Seta Lista no Model da View	
        that.getView().setModel(that.BenefEx, "benefEx");
      }
      
      function fErrorEx(oEvent) {
        var message = $(oEvent.response.body).find('message').first().text();
        
        if (message.substring(2, 4) === "99") {
          var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
          var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
          var zMessage = formattedDetail.replace("error", "");
          
          this.fVerifyAllowedUser(message, this);
          MessageBox.error(zMessage);
          
        } else {
          MessageBox.error(message);
        }
      }
      oModel.read("ET_SH_DEPEN_TYPE_PLAN_EXCL", null, urlParam, false, fSuccessEx, fErrorEx);
    },
    //	--------------------------------------------
    //	fSearchHelps
    //	--------------------------------------------		
    fSearchHelps: function (that, pernr) {
      //this.fShTipoAuxilio(that, pernr);
      this.fShPeriodo(that, pernr);
    },
    // --------------------------------------------
    // fFillCreateDepAidData
    // -------------------------------------------- 		
    fFillCreateDepAidData: function (oCreate, that) {
      var oActualModel = that.getView().getModel("ET_BLOCK").getData();
      var dtFrom = this.dataFormatada(that.getView().byId("dtPeriodFrom").getDateValue());
      var key = that.getView().byId("slSolType").getSelectedKey();
      if (key === "S") {
        var dtTo = this.dataFormatada(this.getView().byId("dtPeriodTo").getDateValue());
      }
      if (oActualModel.EXCLUDE === true || oActualModel.ACTIO === "DEL") {
        oCreate.BLOCK.ACTIO = "DEL";
        oCreate.BLOCK.TYPE_DEPEN = "";
        oCreate.BLOCK.OBJPS = "";
        oCreate.BLOCK.FCNAM = "";
        oCreate.BLOCK.TIP_AUX = oActualModel.TIP_AUX;
        oCreate.BLOCK.PERIOD_FROM = dtFrom;
        oCreate.BLOCK.PERIOD_TYPE = that.getView().byId("slSolType").getSelectedKey();
        if (key === "S") {
          oCreate.BLOCK.PERIOD_TO = dtTo;
        } else {
          oCreate.BLOCK.PERIOD_TO = "";
        }
        oCreate.BLOCK.BETRG = 0;
        oCreate.BLOCK.INSTITUICAO = "";
        oCreate.BLOCK.CNPJ_INST = "";
        oCreate.BLOCK.REEMBOLSO = "";
        if (oCreate.BLOCK.REQUISITION_ID === "00000000" || oCreate.BLOCK.REQUISITION_ID === undefined) {
          oCreate.BLOCK.DT_SOLICIT = that.dataFormatada(new Date());
        } else {
          oCreate.BLOCK.DT_SOLICIT = oActualModel.DT_SOLICIT;
        }
        return;
      }
      
      oCreate.BLOCK.ACTIO = "INS";
      oCreate.BLOCK.TYPE_DEPEN = oActualModel.TYPE_DEPEN;
      oCreate.BLOCK.OBJPS = oActualModel.OBJPS;
      oCreate.BLOCK.FCNAM = oActualModel.FCNAM;
      oCreate.BLOCK.TIP_AUX = oActualModel.TIP_AUX;
      oCreate.BLOCK.PERIOD_FROM = dtFrom;
      oCreate.BLOCK.PERIOD_TYPE = that.getView().byId("slSolType").getSelectedKey();
      if (key === "S") {
        oCreate.BLOCK.PERIOD_TO = dtTo;
      } else {
        oCreate.BLOCK.PERIOD_TO = "";
      }
      oCreate.BLOCK.BETRG = oActualModel.BETRG;
      oCreate.BLOCK.INSTITUICAO = oActualModel.INSTITUICAO;
      oCreate.BLOCK.CNPJ_INST = oActualModel.CNPJ_INST;
      oCreate.BLOCK.REEMBOLSO = oActualModel.REEMBOLSO;
      if (oCreate.BLOCK.REQUISITION_ID === "00000000" || oCreate.BLOCK.REQUISITION_ID === undefined) {
        oCreate.BLOCK.DT_SOLICIT = that.dataFormatada(new Date());
      } else {
        oCreate.BLOCK.DT_SOLICIT = oActualModel.DT_SOLICIT;
      }
      
    },
    dataFormatada: function (oData) {
      if(!oData) return;
      var dia = oData.getDate().toString(),
      diaF = (dia.length === 1) ? "0" + dia : dia,
      mes = (oData.getMonth() + 1).toString(), //+1 pois no getMonth Janeiro começa com zero.
      mesF = (mes.length === 1) ? "0" + mes : mes,
      anoF = oData.getFullYear();
      return anoF + mesF + diaF;
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
      oCreate.OBSERVATION = that.getView().byId("taJust").getValue();
      
      if (oCreate.IM_LOGGED_IN === 5) {
        oCreate.OBSERVATION = that.getView().byId("taJustSSG").getValue();
      }
      
      that.fFillCreateDepAidData(oCreate, that);
      
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
          that.setDocumentStatus(oGlobalData.IM_REQUISITION_ID,action);
          //lê dependentes de novo para excluir da lista de permitidos o tipo de solicitação
          //que acabou de ser criado
          that.getDependents(that);

          that.clearHideFormDepAid();
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
          
          if ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body).length === 0) {
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
        oModel.create("ET_DEP_AID", oCreate, null, fSuccess, fError);
      },
      
      // --------------------------------------------
      // onSend
      // --------------------------------------------  
      onSend: function () {
        var that = this;
        
        var oBundle;
        oBundle = this.getView().getModel("i18n").getResourceBundle();
        
        if (this.exclude !== true) {
          var regras = this.onRegras();
          if (regras === false) {
            return;
          }
          
          var oblig = this.fObligatoryFields();
          
          if (oblig === false) {
            this.handleErrorMessageBoxPress();
            return;
          }
          
          if(this.getView().byId('ipRequestedValue').getValueState() !== sap.ui.core.ValueState.None) {
            this.handleErrorNumericField();
            return;
          }
        }
        
        var valid = this.validAttachment();
        
        if (valid === false) {
          return;
        }
        
        if (this.getView().getModel("ET_HEADER").getData().BUKRS === "NEO") {
          MessageBox.confirm(oBundle.getText('termo_dependente'), {
            title: 'Termo',
            initialFocus: sap.m.MessageBox.Action.OK,
            onClose: function (sButton) {
              if (sButton === MessageBox.Action.OK) {
                that.exclude = false;
                that.fActions(that, "envio", "S");
                return true;
              }
            }
          });
        } else {
          that.exclude = false;
          that.fActions(that, "envio", "S");
        }
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
        
        var req = this.getView().getModel("ET_GLOBAL_DATA").IM_REQUISITION_ID;
        var filename = oEvent.getParameter("fileName");
        var caracteristica = "FORMULARIOCOMPRAUXDEP";
        
        if (req === '00000000') {
          return;
        }
        
        // FILENAME; DMS TYPE; REQUISITION; OPERATION TYPE; CHARACTERISTIC, STATUS, PERNR
        var dados = filename + ";BDV;" + req + ";INSERT;" + caracteristica + ";S" + ";" + pernr;
        
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
      onChangeRequestedValue: function (oEvent) {
        var block = this.getView().getModel("ET_BLOCK").getData();
        block.BETRG = parseFloat(oEvent.getParameter("value").replace(/\./g, '').replace(',', '.'));
        if (isNaN(block.BETRG)){
          oEvent.getSource().setValueState(sap.ui.core.ValueState.Error);
          oEvent.getSource().setValueStateText("Informar valor numérico");
        }else{
          oEvent.getSource().setValueState(sap.ui.core.ValueState.None);
          oEvent.getSource().setValueStateText("");
        }
      },
      onChange: function (oEvent) {},
      onLiveChange: function (oEvent) {
        
      },
      getDependents: function (that) {
        // var oEntry = [];
        var pernr = that.getView().getModel("ET_HEADER").getData().PERNR;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_MAINTENANCE_CADASTRAL_SRV/");
        var urlParam = null;
        
        that.Benef = new JSONModel();
        that.Benef.setData({
          table: []
        });
        
        var oModel_ET_BLOCK = that.getView().getModel("ET_BLOCK").getData();
        if (pernr !== undefined && pernr !== null && pernr !== "") {
          urlParam = this.fFillURLFilterParam("PERNR", pernr);
          urlParam = this.fFillURLFilterParam("PERIOD_FROM", oModel_ET_BLOCK.PERIOD_FROM, urlParam);
        }
        
        function fSuccess(oEvent) {
          
          if (oEvent.results.length <= 0) {
            return;
          }
          const depen = {
            results: oEvent.results
          };
          const oTable = that.getView().byId("tDependents");
          const selectedIndex = oTable.getSelectedIndex();
          const tipo_auxilio = oModel_ET_BLOCK.TIP_AUX;
          if (selectedIndex >= 0 && oEvent.results && oEvent.results[selectedIndex]) {
            const currentDep = oEvent.results[selectedIndex];
            if(currentDep.MESSAGE.search(tipo_auxilio) !== -1){
              const msg = 'Já existe reembolso para o período selecionado';
              that.getView().byId('dtPeriodFrom').setValueState(sap.ui.core.ValueState.Error);
              that.getView().byId('dtPeriodFrom').setValueStateText(msg);
              MessageBox.error(msg);
            }else{
              that.getView().byId('dtPeriodFrom').setValueState(sap.ui.core.ValueState.None);
              that.getView().byId('dtPeriodFrom').setValueStateText();
            }
          }
          var oValue = new sap.ui.model.json.JSONModel(depen);
          that.getView().setModel(oValue, "ET_DEPENDENTS");
          oTable.setSelectedIndex(selectedIndex);
          
        }
        
        function fError(oEvent) {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) === "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            that.fVerifyAllowedUser(message, that);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
        
        oModel.read("ET_DEPEN_AID_L", null, urlParam, false, fSuccess, fError);
        
      },
      onDependentRowSelectionChange: function (oEvent) {
        //retorna a quantidade de elementos de baseArray que
        //não existem em compArray
        const countMissing = (baseArray,compArray) => {
          var counter = 0;
          for (let i = 0; i < baseArray.length; i++) {
            const element = baseArray[i];
            if(!compArray.includes(element)) counter ++;
          }
          return counter;
        }

        var selectedRow = this.fGetSelectedRowDetail();
        if(!selectedRow){
          this.clearHideFormDepAid();
          return;
        } 
        this.fFillDependentDetail(selectedRow);
        
        // habilita botoes conforme disponibilidade
        var results = this.getView().getModel("ET_DEPENDENTS").getData().results;
        for (var i = 0; i < results.length; i++) {
          if (results[i].OBJPS === selectedRow.OBJPS) {
            let i0377 = results[i].I0377.split(";").filter(r => r !== "");
            let i9377 = results[i].I9377.split(";").filter(r => r !== "");
            let permitidos = results[i].PERMITIDOS.split(";").filter(r => r !== "");
            // var str = results[i].TIP_AUX_ATUAL;
            this.getView().byId("btnAddSol").setEnabled(countMissing(permitidos,i0377) > 0);
            this.getView().byId("btnReembolso").setEnabled(i0377.length > 0);
            this.getView().byId("btnExcluir").setEnabled(i0377.length > 0);
          }
        }
      },
      //--------------------------------------------
      //	fGetSelectedRowDetail
      //--------------------------------------------		
      fGetSelectedRowDetail: function () {
        var oTable = this.getView().byId("tDependents");
        var selectedIndex = oTable.getSelectedIndex();
        var oTableModel = this.getView().byId("tDependents").getModel("ET_DEPENDENTS");
        var completeRows = oTableModel.getData();
        return completeRows.results[selectedIndex];
      },
      fFillDependentDetail: function (selectedRow) {
        var oView = this.getView();
        if (selectedRow !== undefined) {
          oView.byId("slFullName").setSelectedKey(selectedRow.FCNAM);
          oView.byId("slMemberType").setSelectedKey(selectedRow.TYPE_DEPEN);
        }
      },
      onChangePeriod: function (oEvent) {
        var key = this.getView().byId("slSolType").getSelectedKey();
        var date = oEvent.getSource().getDateValue();
        this.ajusteDataTo(date, key);
        this.getDependents(this);
      },
      onChangeSol: function (oEvent) {
        var key = oEvent.getSource().getSelectedKey();
        var date = this.getView().byId("dtPeriodFrom").getDateValue();
        this.ajusteDataTo(date, key);
      },
      ajusteDataTo: function (oDataFrom, key) {
        var block = this.getView().getModel("ET_BLOCK").getData();
        block.PERIOD_FROM = this.dataFormatada(oDataFrom);
        block.PERIOD_TYPE = key;
        if (key === "M") { // solicitacao mensal
          this.getView().byId("lblPeriodTo").setVisible(false);
          this.getView().byId("dtPeriodTo").setVisible(false);
          this.getView().byId("dtPeriodTo").setDateValue(oDataFrom);
          this.getView().byId("dtPeriodTo").setDateValue();
          block.PERIOD_TO = "";
        } else { // solicitacao semestral
          var dtTo = new Date();
          if(oDataFrom){
            if (oDataFrom.getMonth() < 8) {
              dtTo = new Date(oDataFrom.getFullYear(), 5, 30);
            } else {
              dtTo = new Date(oDataFrom.getFullYear(), 11, 31);
            }
          }
          this.getView().byId("lblPeriodTo").setVisible(true);
          this.getView().byId("dtPeriodTo").setVisible(true);
          this.getView().byId("dtPeriodTo").setEnabled(false);
          this.getView().byId("dtPeriodTo").setDateValue(dtTo);
          block.PERIOD_TO = this.dataFormatada(dtTo);
        }
      },
      onFormulario: function () {
        
        var that = this;
        var oModel = new sap.ui.model.odata.ODataModel("/sap/opu/odata/SAP/ZODHR_SS_AUXILIO_DEP_SRV/");
        
        function fSuccess(oEvent) {
          window.open(oEvent.results[0].LinkPdf);
        }
        
        function fError(oEvent) {
          var message = $(oEvent.response.body).find('message').first().text();
          
          if (message.substring(2, 4) === "99") {
            var detail = ($(":contains(" + "/IWBEP/CX_SD_GEN_DPC_BUSINS" + ")", oEvent.response.body));
            var formattedDetail = detail[2].outerText.replace("/IWBEP/CX_SD_GEN_DPC_BUSINS", "");
            var zMessage = formattedDetail.replace("error", "");
            
            that.fVerifyAllowedUser(message, that);
            MessageBox.error(zMessage);
            
          } else {
            MessageBox.error(message);
          }
        }
        
        var oblig = this.fObligatoryFields();
        
        if (oblig === false && this.exclude !== true) {
          this.handleErrorMessageBoxPress();
          return;
        }
        
        if(this.getView().byId('ipRequestedValue').getValueState() !== sap.ui.core.ValueState.None) {
          this.handleErrorNumericField();
          return;
        }
        var dataFrom = this.dataFormatada(this.getView().byId("dtPeriodFrom").getDateValue());
        // var dataTo = this.dataFormatada(this.getView().byId("dtPeriodTo").getDateValue());
        var block = this.getView().getModel("ET_BLOCK").getData();
        
        var IvTpAux = this.getView().byId("cbTypeAux").getValue();
        var IvPeriodo = dataFrom.substring(0, 6);
        var IvOpPer = this.getView().byId("slSolType").getSelectedKey();
        var IvValAux = block.BETRG;
        var IvNomeDep = block.FCNAM;
        var IvInstBaba = block.INSTITUICAO;
        var IvCnpjCpf = block.CNPJ_INST;
        var IvTpSoli;
        
        if (this.exclude === true) {
          IvPeriodo = "";
          IvOpPer = "";
          IvValAux = "";
          IvNomeDep = "";
          IvInstBaba = "";
          IvCnpjCpf = "";
          IvTpSoli = "E";
          IvInstBaba = "";
          
          if (this.getView().byId("cbTypeAuxExclude")) {
            if (this.getView().byId("cbTypeAuxExclude").getValue() !== "") {
              IvInstBaba = this.getView().byId("cbTypeAuxExclude").getValue();
            }
          }
        }
        
        if (IvCnpjCpf === undefined) {
          IvCnpjCpf = "";
        }
        
        if (block.TYPE_SOL === "Reembolso") {
          IvTpSoli = "R";
        } else if (this.exclude !== true) {
          IvTpSoli = "P";
        }
        
        var url = "?$filter=IvTpSoli eq '" + IvTpSoli + "' and IvTpAux eq '" + IvTpAux + "' and IvPeriodo eq '" + IvPeriodo +
        "' and IvOpPer eq '" + IvOpPer + "' and IvValAux eq '" + IvValAux + "' and IvNomeDep eq '" + IvNomeDep + "' and IvInstBaba eq '" +
        IvInstBaba + "' and IvCnpjCpf eq '" + IvCnpjCpf + "'";
        //MAIN READ
        oModel.read("AuxilioDepSet" + url, null, null, false, fSuccess, fError);
        
      },
      clearHideFormDepAid: function() {
        var model = this.getView().getModel("ET_BLOCK");
        model.getData().OBJPS = "";
        model.getData().FCNAM = "";
        model.getData().TIP_AUX = "";
        model.getData().VALUE = "";
        model.getData().DATA = "";
        model.getData().TYPE_SOL = "";
        model.getData().REEMBOLSO = "";
        model.getData().PERIOD_FROM = "";
        model.getData().PERIOD_TO = "";
        model.getData().PERIOD_TYPE = "M";
        this.getView().byId("dtPeriodFrom").setDateValue();
        this.getView().byId("dtPeriodTo").setDateValue();
        this.fEsconderCamposExcluir(false);
        this.getView().byId("slSolType").setSelectedKey("M");
        this.getView().byId("slSolType").setEnabled(true);
        this.exclude = false;
        model.getData().EXCLUDE = false;
        
        this.getView().setModel(model, "ET_BLOCK");
        this.getView().byId("formDepAid").setVisible(false);
        this.getView().byId("btnForms").setVisible(false);
        this.getView().byId("btnAccept").setVisible(false);

        this.getView().byId("btnAddSol").setEnabled(false);
        this.getView().byId("btnReembolso").setEnabled(false);
        this.getView().byId("btnExcluir").setEnabled(false);
      },
      onDependentsAction: function (oEvent) {
        var oButtonName = oEvent.getParameter("id").substring(12);
        // var oView = this.getView();
        // var buttonAction;
        // var action = {};
        
        var selectedRow = this.fGetSelectedRowDetail();
        
        if (selectedRow === undefined) {
          MessageBox.error("Selecionar dependente.");
          return;
        }
        this.fFillDependentDetail(selectedRow);
        // preenche Benefícios conforme Regras
        this.fShTipoAuxDep(oButtonName);
        
        switch (oButtonName) {
          case "btnAddSol":
          var model = this.getView().getModel("ET_BLOCK");
          model.getData().OBJPS = selectedRow.OBJPS;
          model.getData().FCNAM = selectedRow.FCNAM;
          model.getData().TIP_AUX = "";
          model.getData().VALUE = "";
          model.getData().DATA = "";
          model.getData().TYPE_SOL = "Primeira Solicitação";
          model.getData().REEMBOLSO = "";
          model.getData().PERIOD_FROM = "";
          model.getData().PERIOD_TO = "";
          model.getData().PERIOD_TYPE = "M";
          this.getView().byId("dtPeriodFrom").setDateValue();
          this.getView().byId("dtPeriodTo").setDateValue();
          this.fEsconderCamposExcluir(true);
          this.getView().byId("slSolType").setSelectedKey("M");
          this.getView().byId("slSolType").setEnabled(true);
          this.exclude = false;
          model.getData().EXCLUDE = false;
          break;
          
          case "btnReembolso":
          model = this.getView().getModel("ET_BLOCK");
          model.getData().OBJPS = selectedRow.OBJPS;
          model.getData().FCNAM = selectedRow.FCNAM;
          model.getData().TYPE = "";
          model.getData().VALUE = "";
          model.getData().DATA = "";
          model.getData().TYPE_SOL = "Reembolso";
          model.getData().REEMBOLSO = "X";
          model.getData().PERIOD_FROM = "";
          model.getData().PERIOD_TO = "";
          model.getData().PERIOD_TYPE = "M";
          this.getView().byId("dtPeriodFrom").setDateValue();
          this.getView().byId("dtPeriodTo").setDateValue();
          this.fEsconderCamposExcluir(true);
          this.getView().byId("slSolType").setSelectedKey("M");
          this.getView().byId("slSolType").setEnabled(true);
          this.exclude = false;
          model.getData().EXCLUDE = false;
          break;
          
          case "btnExcluir":
          model = this.getView().getModel("ET_BLOCK");
          model.getData().OBJPS = selectedRow.OBJPS;
          model.getData().FCNAM = selectedRow.FCNAM;
          model.getData().TIP_AUX = "";
          model.getData().VALUE = "";
          model.getData().DATA = "";
          model.getData().TYPE_SOL = "Exclusão";
          model.getData().REEMBOLSO = "";
          model.getData().PERIOD_FROM = "";
          model.getData().PERIOD_TO = "";
          model.getData().PERIOD_TYPE = "M";
          this.getView().byId("dtPeriodFrom").setDateValue();
          this.getView().byId("dtPeriodTo").setDateValue();
          this.fEsconderCamposExcluir(false);
          break;
        }
        this.getView().setModel(model, "ET_BLOCK");
        this.getView().byId("formDepAid").setVisible(true);
        this.getView().byId("btnForms").setVisible(true);
        this.getView().byId("btnAccept").setVisible(true);
      },
      fObligatoryFields: function () {
        
        var model = this.getView().getModel("ET_BLOCK").getData();
        // if (model.TYPE_DEPEN == "" || model.TYPE_DEPEN == undefined || 
        //     model.FCNAM == "" || model.FCNAM == undefined || 
        //     model.TYPE_SOL == "" || model.TYPE_SOL == undefined ||
        //     model.TIP_AUX == "" || model.TIP_AUX == undefined || 
        //     parseFloat(model.BETRG) <= 0 || model.BETRG == "" || model.BETRG == undefined || 
        //     model.INSTITUICAO == "" || model.INSTITUICAO == undefined ) {
        // 	return false;
        // }
        
        if (model.BETRG === undefined) {
          var reqValue = this.getView().byId("ipRequestedValue").getValue(); 
          model.BETRG = parseFloat(reqValue.replace(/\./g,'').replace(',', '.'));
        }
        // Verifica se campos obrigatórios foram preenchidos
        // (rever obrigatoriedade)
        if (model.TYPE_DEPEN === "" || model.TYPE_DEPEN === undefined || 
        model.FCNAM === "" || model.FCNAM === undefined || 
        model.TYPE_SOL === "" || model.TYPE_SOL === undefined ||
        model.TIP_AUX === "" || model.TIP_AUX === undefined || 
        model.BETRG <= 0 || model.BETRG === "" || model.BETRG === undefined || 
        model.INSTITUICAO === "" || model.INSTITUICAO === undefined ) {
          return false;
        }
      },
      fEsconderCamposExcluir: function (status) {
        this.getView().byId("lblSolType").setVisible(status);
        this.getView().byId("slSolType").setVisible(status);
        this.getView().byId("lblPeriodFrom").setVisible(status);
        this.getView().byId("dtPeriodFrom").setVisible(status);
        this.getView().byId("lblRequestedValue").setVisible(status);
        this.getView().byId("ipRequestedValue").setVisible(status);
        this.getView().byId("lblInst").setVisible(status);
        this.getView().byId("ipInst").setVisible(status);
        this.getView().byId("lblCNPJ").setVisible(status);
        this.getView().byId("ipCNPJ").setVisible(status);
        this.getView().byId("cbTypeAux").setEnabled(status);
      },
      onMemberChange: function () {
        var results = this.getView().getModel("ET_DEPENDENTS").getData().results;
        var model = this.getView().getModel("ET_BLOCK");
        var encontrou = false;
        
        for (var i = 0; results.length > i; i++) {
          if (model.getData().FCNAM === results[i].FCNAM) {
            model.getData().TYPE_DEPEN = results[i].TYPE_DEPEN;
            model.getData().IDADE = results[i].IDADE;
            model.getData().IDADE_MES = results[i].IDADE_MES;
            model.getData().IDADE_DIA = results[i].IDADE_DIA;
            model.getData().MGUA_ERROR = results[i].MGUA_ERROR;
            model.getData().I0377 = results[i].I0377;
            model.getData().I9377 = results[i].I9377;
            this.getView().setModel(model, "ET_BLOCK");
            encontrou = true;
            break;
          }
        }
        if (encontrou === true) {
          this.onRegras();
        }
        
      },
      onRegras: function () {
        var results = this.getView().getModel("ET_DEPENDENTS").getData().results;
        var block = this.getView().getModel("ET_BLOCK").getData();
        var anos = parseInt(block.IDADE);
        var meses = parseInt(block.IDADE_MES);
        var dias = parseInt(block.IDADE_DIA);
        var valid = true;
        
        for (var i = 0; results.length > i; i++) {
          if (block.FCNAM === results[i].FCNAM) {
            block.TYPE_DEPEN = results[i].TYPE_DEPEN;
            block.IDADE = results[i].IDADE;
            block.IDADE_MES = results[i].IDADE_MES;
            block.IDADE_DIA = results[i].IDADE_DIA;
            block.MGUA_ERROR = results[i].MGUA_ERROR;
            block.I0377 = results[i].I0377;
            block.I9377 = results[i].I9377;
            break;
          }
        }
        // verifica se pode executar a ação
        if (block.TYPE_SOL === "Primeira Solicitação"){
          if (block.I0377.includes(block.TIP_AUX)) {
            this.getView().byId("cbTypeAux").setSelectedKey();
            MessageBox.error("Benefício já foi solicitado anteriormente.");
            return false;
          }
        }
        if (block. TYPE_SOL === "Reembolso") {
          if (!block.I0377.includes(block.TIP_AUX)) {
            this.getView().byId("cbTypeAux").setSelectedKey();
            MessageBox.error("Benefício não solicitado. Fazer Primeira solicitação.");
            return false;
          }
        }
        if (block. TYPE_SOL === "Exclusão") {
          if (!block.I0377.includes(block.TIP_AUX)) {
            this.getView().byId("cbTypeAux").setSelectedKey();
            MessageBox.error("Benefício não solicitado. Não é possível excluir.");
            return false;
          }
        }
        // outras validações (idade e elegibilidade)
        if (block.TIP_AUX === "ACRC") {
          if ((meses < 7 && (anos < 1)) || (anos > 4)) {
            valid = false;
          }
        }
        if (block.TIP_AUX === "CREC") {
          if (anos >= 1 || (anos < 1 && meses > 6)) {
            valid = false;
          }
        }
        if (block.TIP_AUX === "MGUA") {
          if (block.MGUA_ERROR != "") {
            valid = false;
          }
          
          if (anos > 4) {
            valid = false;
          }
        }
        if (block.TIP_AUX === "PREE") {
          if (anos < 2 || anos > 9 || (anos === 9 && meses >= 11 && dias > 29)) {
            valid = false;
          }
        }
        if (valid === false) {
          this.getView().byId("cbTypeAux").setSelectedKey();
          MessageBox.error("Benefício não elegível para esse dependente.");
        }
        return valid;
      },
      _getDialog: function () {
        // create dialog lazily
        if (!this._oDialog) {
          // create dialog via fragment factory
          this._oDialog = sap.ui.xmlfragment("cadastralMaintenance.view.DetailDepAidExclude", this);
          // connect dialog to view (models, lifecycle)
          this.getView().addDependent(this._oDialog);
        }
        this.exclude = true;
        return this._oDialog;
      },
      onSendExclude: function () {
        var model = this.getView().getModel("ET_BLOCK");
        
        if (model.getData().TIP_AUX === "" || model.getData().TIP_AUX === undefined) {
          this.handleErrorMessageBoxPress();
          return;
        }
        
        this.exclude = true;
        model.getData().EXCLUDE = true;
        this.getView().setModel(model, "ET_BLOCK");
        this.getView().byId("btnForms").setVisible(true);
        this.getView().byId("btnAccept").setVisible(true);
        this.onCloseDialogExclude();
        
      },
      onExclude: function () {
        this._getDialog().open();
      },
      onCloseDialogExclude: function () {
        this._getDialog().close();
      },
      yyyymmdd: function(lData) {
        var mm = lData.getMonth() + 1; // getMonth() is zero-based
        var dd = lData.getDate();
        return [lData.getFullYear(), (mm>9 ? '' : '0') + mm, (dd>9 ? '' : '0') + dd].join('');
      }
      // toFloat: function (source) {
      //     let float = accounting.unformat(source);
      //     let posComma = source.indexOf(',');
      //     if (posComma > -1) {
      //         let posDot = source.indexOf('.');
      //         if (posDot > -1 && posComma > posDot) {
      //             let germanFloat = accounting.unformat(source, ',');
      //             if (Math.abs(germanFloat) > Math.abs(float)) {
      //                 float = germanFloat;
      //             }
      //         } else {
      //             // source = source.replace(/,/g, '.');
      //             float = accounting.unformat(source, ',');
      //         }
      //     }
      //     return float;
      // }
    });
  });