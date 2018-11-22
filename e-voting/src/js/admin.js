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

    // setting up contract providers and transaction defaults for ALL contract instances
    VotingContract.setProvider(window.web3.currentProvider)
    VotingContract.defaults({from: window.web3.eth.accounts[0],gas:6721975})

    // creates an VotingContract instance that represents default address managed by VotingContract
    VotingContract.deployed().then(function(instance){

      // calls getNumOfCandidates() function in Smart Contract,
      // this is not a transaction though, since the function is marked with "view" and
      // truffle contract automatically knows this
      window.App.PostBoxRefresh()
      
     })
  },
  PostBoxRefresh : function()
  {

      var select_box = $('#posts-box')
      var select_box1 = $('#posts-box1')
      window.App.GetPosts(select_box)
      window.App.GetPosts(select_box1)

  },
  AdminAddpost : function()
  {
    VotingContract.deployed().then(function(instance){
        var postName = $("#postName").val() //getting postname

        if(postName=="")
        {
          $("#msg_post").html("<p>Please enter valid post.</p>")
          return
        }

        instance.addPost(window.web3.fromUtf8(postName)).then(function(result){
          console.log("new post added successfully with postID: " + result.logs[0].args.postID)
          $("#msg_post").html("<p>New post successfully added.</p>")
          window.App.PostBoxRefresh()
        }).catch(function(err){
              console.error("ERROR! " + err.message)
        })

    }).catch(function(err){
        console.error("ERROR! " + err.message)
    })

  },

  GetPosts: function (select_box) {
    VotingContract.deployed().then(function(instance){

         instance.getNumOfPosts().then(function(numPosts){
              $(select_box)
                    .empty()
                    .append('<option selected="selected" value = "-1">Select Post</option>')

              if(numPosts  > 0 )
              {
                  for (var i = 0; i < numPosts; i++ ){
                      instance.getPost(i).then(function(data){
                      $(select_box).append($("<option></option>")
                              .attr("value",data[0])
                              .text(""+ window.web3.toUtf8(data[1])))
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

  AdminAddCandidate:function()
  {
    VotingContract.deployed().then(function(instance){

        var CandidateName = $("#CandidateName").val() //getting user inputted Candidate Name
        var postID = $("#posts-box").val()

        if (CandidateName == ""){
          $("#msg_candidate").html("<p>Please enter candidate name.</p>")
          return
        }
        if (postID == -1 )
        {
          $("#msg_candidate").html("<p>Please select post.</p>")
          return
        }

        instance.addCandidate(window.web3.fromUtf8(CandidateName),parseInt(postID)).then(function(result){
            console.log("New candidate added successfully with CandidateID: " + result.logs[0].args.candidateID)
            $("#msg_candidate").html("<p>New candidate successfully added.</p>")
            window.App.fetchCandidates()
        }).catch(function(err){
            console.error("ERROR! " + err.message)
        })
    }).catch(function(err){
       console.error("ERROR! " + err.message)
    })
  },

  CountVotes: function()
  {
      var selectedPost = $('#posts-box1').children("option:selected").val();
      if (selectedPost == -1)
      {
        alert("Please Select Valid Post")
        return 
      }

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
                            if(selectedPost == eachCandidate[3])
                            {
                              $('#vote-table > tbody:last-child').append('<tr><td>'+ eachCandidate[0] +'</td>' + '<td>' + window.web3.toUtf8(eachCandidate[4]) + '</td><td>' + window.web3.toUtf8(eachCandidate[1]) + '</td><td>' + eachCandidate[2] + '</td></tr>')
                            }
                      })
                  }
              }
              else{
                $('#vote-box').append('<p>No candidates added</p>')
              }
          })
        }).catch(function(err){
             console.error("ERROR! " + err.message)
        })
        window.App.ChartLoader()
  },
  DrawChart :function(PostName,candidates_votes)
  {
      
      google.charts.load("current", {packages:["corechart"]});
      google.charts.setOnLoadCallback(drawChart);
      function drawChart() {
        var data = google.visualization.arrayToDataTable(candidates_votes);

        var options = {
          title: PostName,
          is3D: true,
        };

        var chart = new google.visualization.PieChart(document.getElementById('voting_piechart'));
        chart.draw(data, options);
      }
  },
  ChartLoader : function()
  {
        var selectedPost = $('#posts-box1').children("option:selected").val();
        var PostName ;

        $('#voting_piechart').empty();
        if(selectedPost == -1)
        {
            // if 'select post' is selected, do nothing
            return
        }     

        VotingContract.deployed().then(function(instance){

            instance.getNumOfCandidates().then(function(numCandidates){

               
              if(numCandidates > 0)
              {
                  var promises = []
                  var candidates_votes = []       
                  candidates_votes.push(['Candidate Name','Votes'])          

                  for (var i = 0; i < numCandidates; i++ ) {
                      promises.push(instance.getCandidate(i))
                  }
                  Promise.all(promises).then(function(candidateArray){
                      var postHasCandidates = false
                      candidateArray.forEach(function(eachCandidate){
                          if(eachCandidate[3] == selectedPost)// [3] is the postID
                          {
                              postHasCandidates = true
                              PostName = window.web3.toUtf8(eachCandidate[4])                          
                              candidates_votes.push([window.web3.toUtf8(eachCandidate[1]),window.web3.toDecimal(eachCandidate[2])])
                              
                          }
                      })
                      console.log("postHasCandidates: " + postHasCandidates);
                      if (!postHasCandidates) $('#voting_piechart').append('<p>No existing candidates for this post</p>')
                      if (postHasCandidates) window.App.DrawChart(PostName,candidates_votes)   

                  })
              }
              else{
                $('#voting_piechart').append('<p>No existing candidates for any post</p>')
              }
              
          }).catch(function(err){
             console.error("ERROR! " + err.message)
            })


        }).catch(function(err){
             console.error("ERROR! " + err.message)
          })



  },

  fetchCandidates : function()
  {
        var selectedPost = $('#posts-box').children("option:selected").val();
        $('#candidate-list').empty();
        if(selectedPost == -1)
        {
            // if 'select post' is selected, do nothing
            return
        }

        console.log("You have selected the post id:   " + selectedPost)

        VotingContract.deployed().then(function(instance){

          instance.getNumOfCandidates().then(function(numCandidates){
              // This is the total number of candidates, not limited to selected category

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
                              $('#candidate-list').append('<li>' + window.web3.toUtf8(eachCandidate[1]) + '</li>');
                                console.log("candidateID: "+ eachCandidate[0]+ ", candidateName: "+window.web3.toUtf8(eachCandidate[1]))
                          }
                      })
                      console.log("postHasCandidates: " + postHasCandidates);
                      if (!postHasCandidates) $('#candidate-list').append('<p>No existing candidates for this post</p>')
                  })
              }
              else{
                $('#candidate-list').append('<p>No existing candidates for any post</p>')
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
