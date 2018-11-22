// import CSS. Webpack with deal with it
"use strict";
import "../css/style.css"

// Import libraries we need.
import { default as Web3} from "web3"
import { default as contract } from "truffle-contract"

// get build artifacts from compiled smart contract and create the truffle contract
import votingArtifacts from "../../build/contracts/Voting.json"
var VotingContract = contract(votingArtifacts)

/*
 * This holds all the functions for the app
 */
window.App = {
  // called when web3 is set up
  start: function() {
	console.log("app.js start function called.")
    // setting up contract providers and transaction defaults for ALL contract instances
    VotingContract.setProvider(window.web3.currentProvider)
    VotingContract.defaults({from: window.web3.eth.accounts[0],gas:6721975})

    // creates an VotingContract instance that represents default address managed by VotingContract
    VotingContract.deployed().then(function(instance){
      console.log("app.js started")
         window.App.GetPosts()
      }).catch(function(err){
            console.error("ERROR! " + err.message)
      })

  },
  GetPosts: function () {
    VotingContract.deployed().then(function(instance){

         instance.getNumOfPosts().then(function(numPosts){

              $('#posts-box')
                    .empty()
                    .append('<option selected="selected" value = "-1">Select Post</option>')

              if(numPosts > 0 )
              {

                 for (var i = 0; i < numPosts; i++ ){

                  instance.getPost(i).then(function(data){
                  $('#posts-box').append($("<option></option>")
                          .attr("value",data[0])
                          .text(""+ window.web3.toUtf8(data[1])));
                  })

                  }
              }
      }).catch(function(err){
          console.error("ERROR! " + err.message)
      })
    }).catch(function(err){
       console.error("ERROR! " + err.message)
    })
  },

  fetchCandidates: function(){

        $('#candidate-box').empty();
        var selectedPost = $('#posts-box').children("option:selected").val();
        if(selectedPost == -1)
        {
            // does nothing when the "Select Post" item is selected
            return
        }

        console.log("You have selected the post id: " + selectedPost)

        VotingContract.deployed().then(function(instance){
          instance.getNumOfCandidates().then(function(numCandidates){
              console.log("numCandidates: "+numCandidates)

              if(numCandidates > 0)
              {
                  var promises = []

                  for (var i = 0; i < numCandidates; i++ ) {
                      promises.push(instance.getCandidate(i))
                  }

                  Promise.all(promises).then(function(candidateArray){
                      var postHasCandidates = false
                      candidateArray.forEach(function(eachCandidate){
                          if(eachCandidate[3] == selectedPost)// [3] is the postID
                          {
                              postHasCandidates = true
                              $('#candidate-box').append($('<input type="radio" name= "radio_voting" value="' + eachCandidate[0] + '"> ' + window.web3.toUtf8(eachCandidate[1]) + '</input><br />'))
                              console.log("candidateID: "+ eachCandidate[0]+ ", candidateName: "+window.web3.toUtf8(eachCandidate[1]))
                          }
                      })
                      console.log("postHasCandidates: " + postHasCandidates);
                      if (!postHasCandidates) $('#candidate-box').append('<p>No existing candidates for this post</p>')
                  })
              }
              else{
                $('#candidate-box').append("<p>No candidates added for any post</p>")
              }
          })
        }).catch(function(err){
            console.error("ERROR! " + err.message)
        })
  },

  AddVote: function()
  {
        var voterID = $("#voterID").val() //getting voterID
        var selectedPost = $('#posts-box').children("option:selected").val();
        var candidateID = $('input:radio[name=radio_voting]:checked').val();

        console.log('voterID: ' + voterID + ', postID: ' + selectedPost + ', candidateID: ' + candidateID)

        if(voterID == "")
        {
          $('#msg').html("<p>Please enter valid VoterID</p>")
          return
        }

        if(selectedPost == -1)
        {
          $('#msg').html("<p>Please select a post</p>")
          return
        }

        // TODO proper handling for no candidate selected case
        if(candidateID == undefined)
        {
          $('#msg').html("<p>Please select a candidate to vote</p>")
          return
        }

        VotingContract.deployed().then(function(instance){
            // seems to vote for first candidate if candidateID is undefined
            instance.vote(window.web3.fromUtf8(voterID), parseInt(candidateID)).then(function(result){
                $('#msg').html('<p>' + result.logs[0].args.message + '</p>')
            })
        }).catch(function(err){
             console.error("ERROR! " + err.message)
        })
  },

  CountVotes: function()
  {
       VotingContract.deployed().then(function(instance){

          instance.getNumOfCandidates().then(function(numCandidates){

               $('#vote-box').empty();
              if(numCandidates >  0)
              {
                  $('#vote-box').append('<table id="vote-table"><tr><th>ID</th><th>Post</th><th>Name</th><th>Votes</th></tr></table>')
                  console.log("numCandidates: " + numCandidates);

                  for (var i = 0; i < numCandidates; i++ ){
                      instance.getCandidate(i).then(function(eachCandidate){
                            console.log(JSON.stringify(eachCandidate))
                            $('#vote-table > tbody:last-child').append('<tr><td>'+ eachCandidate[0] +'</td>' + '<td>' + window.web3.toUtf8(eachCandidate[4]) + '</td><td>' + window.web3.toUtf8(eachCandidate[1]) + '</td><td>' + eachCandidate[2] + '</td></tr>')
                      })
                  }

              }
              else{
                $('#vote-box').append('<p>No candidates added for any post</p>')
              }
          })
        }).catch(function(err){
             console.error("ERROR! " + err.message)
        })
  }
}

$(document).ready(function(){
    $("#posts-box").change(function(){
        window.App.fetchCandidates()
    });
});

// When the page loads, we create a web3 instance and set a provider. We then set up the app
window.addEventListener("load", function() {
  // Is there an injected web3 instance?
  if (typeof web3 !== "undefined") {
    console.warn("Using web3 detected from external source like Metamask")
    // If there is a web3 instance(in Mist/Metamask), then we use its provider to create our web3object
    window.web3 = new Web3(web3.currentProvider)
  } else {
    console.warn("No web3 detected. Falling back to http://localhost:9545. You should remove this fallback when you deploy live, as it's inherently insecure. Consider switching to Metamask for deployment. More info here: http://truffleframework.com/tutorials/truffle-and-metamask")
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    window.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:9545"))
  }
  // initializing the App
  window.App.start()
})
